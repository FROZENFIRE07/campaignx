/**
 * Dynamic API Discovery - Reads OpenAPI spec and builds tool registry for LLM
 * This is the KEY differentiator - no hardcoded API calls
 */

const OPENAPI_SPEC_PATH = '/openapi.json';

// Parse OpenAPI spec and build tool definitions for LLM
export function parseOpenAPISpec(spec) {
    const tools = [];
    const paths = spec.paths || {};

    for (const [path, methods] of Object.entries(paths)) {
        for (const [method, operation] of Object.entries(methods)) {
            const tool = {
                name: operation.operationId || `${method}_${path.replace(/\//g, '_')}`,
                description: operation.description || operation.summary || '',
                method: method.toUpperCase(),
                path: path,
                parameters: [],
                requestBody: null,
                responses: {},
            };

            // Parse query parameters
            if (operation.parameters) {
                tool.parameters = operation.parameters.map(p => ({
                    name: p.name,
                    in: p.in,
                    required: p.required || false,
                    type: p.schema?.type || 'string',
                    description: p.description || '',
                }));
            }

            // Parse request body
            if (operation.requestBody) {
                const content = operation.requestBody.content?.['application/json'];
                if (content?.schema) {
                    tool.requestBody = resolveSchema(content.schema, spec.components?.schemas || {});
                }
            }

            // Parse response schemas
            for (const [code, response] of Object.entries(operation.responses || {})) {
                const respContent = response.content?.['application/json'];
                if (respContent?.schema) {
                    tool.responses[code] = resolveSchema(respContent.schema, spec.components?.schemas || {});
                }
            }

            tools.push(tool);
        }
    }

    return tools;
}

// Resolve $ref schemas
function resolveSchema(schema, schemas) {
    if (schema.$ref) {
        const refName = schema.$ref.split('/').pop();
        const resolved = schemas[refName];
        if (resolved) {
            return { ...resolved, _name: refName };
        }
    }
    return schema;
}

// Build LLM-friendly tool description
export function buildToolDescriptions(tools) {
    return tools.map(tool => {
        let desc = `**${tool.name}** [${tool.method} ${tool.path}]\n`;
        desc += `${tool.description}\n`;

        if (tool.parameters.length > 0) {
            desc += `Query Parameters:\n`;
            tool.parameters.forEach(p => {
                desc += `  - ${p.name} (${p.type}, ${p.required ? 'required' : 'optional'}): ${p.description}\n`;
            });
        }

        if (tool.requestBody) {
            desc += `Request Body: ${JSON.stringify(tool.requestBody.example || tool.requestBody.properties, null, 2)}\n`;
        }

        return desc;
    }).join('\n---\n');
}

// Execute a dynamically discovered API call
export async function executeAPICall(tool, params = {}, body = null, apiKey = null) {
    const baseUrl = process.env.CAMPAIGNX_API_BASE;
    let url = `${baseUrl}${tool.path}`;

    // Apply query parameters
    const queryParams = new URLSearchParams();
    tool.parameters.forEach(p => {
        if (params[p.name] !== undefined) {
            queryParams.set(p.name, params[p.name]);
        }
    });
    const queryString = queryParams.toString();
    if (queryString) url += `?${queryString}`;

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-API-Key'] = apiKey;

    const startTime = Date.now();
    console.log(`[API-CALL] >> ${tool.method} ${url} (timeout: 120s)`);
    if (body) console.log(`[API-CALL]    Body keys: ${Object.keys(body).join(', ')}`);

    // Add timeout to prevent indefinite hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const fetchOptions = {
        method: tool.method,
        headers,
        signal: controller.signal,
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(tool.method)) {
        fetchOptions.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[API-CALL] << ${tool.method} ${tool.path} → ${response.status} (${elapsed}s)`);
        const data = await response.json();
        const dataSize = JSON.stringify(data).length;
        console.log(`[API-CALL]    Response: ${dataSize} bytes, keys: ${Object.keys(data).join(', ')}`);
        if (data.total_count !== undefined) console.log(`[API-CALL]    Records: ${data.total_count}`);
        return { status: response.status, data };
    } catch (err) {
        clearTimeout(timeoutId);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (err.name === 'AbortError') {
            console.error(`[API-CALL] !! TIMEOUT after ${elapsed}s: ${tool.method} ${tool.path}`);
            throw new Error(`API call to ${tool.path} timed out after 120s`);
        }
        console.error(`[API-CALL] !! ERROR after ${elapsed}s: ${tool.method} ${tool.path} → ${err.message}`);
        throw err;
    }
}

// Store the parsed spec in memory with TTL
let cachedTools = null;
let cachedSpec = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearAPIToolsCache() {
    cachedTools = null;
    cachedSpec = null;
    cacheTimestamp = 0;
}

export async function getAPITools() {
    const now = Date.now();
    if (cachedTools && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return { tools: cachedTools, spec: cachedSpec };
    }

    // Read the openapi.json from the project root
    const fs = await import('fs');
    const path = await import('path');
    const specPath = path.join(process.cwd(), 'public', 'openapi.json');

    try {
        const specContent = fs.readFileSync(specPath, 'utf-8');
        cachedSpec = JSON.parse(specContent);
        cachedTools = parseOpenAPISpec(cachedSpec);
        cacheTimestamp = now;
        return { tools: cachedTools, spec: cachedSpec };
    } catch (e) {
        console.error('Failed to load OpenAPI spec:', e);
        return { tools: [], spec: null };
    }
}

export function findTool(tools, operationId) {
    return tools.find(t => t.name === operationId);
}

/**
 * Get only the OPERATIONAL tools (excludes one-time setup like signup).
 * The agent should only see campaign-relevant endpoints during workflow execution.
 * Signup is done once during initial setup — the API key is reused after that.
 */
export function getOperationalTools(tools) {
    const ONE_TIME_TAGS = ['Authentication'];
    const ONE_TIME_PATHS = ['/api/v1/signup'];
    return tools.filter(t =>
        !ONE_TIME_PATHS.includes(t.path) &&
        !t.description?.toLowerCase().includes('register a new team')
    );
}
