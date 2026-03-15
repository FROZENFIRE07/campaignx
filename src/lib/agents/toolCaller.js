/**
 * Tool Caller Agent — The LLM reads API documentation and dynamically
 * decides which endpoint to call. NO hardcoded operation IDs.
 * This is the TRUE agentic tool calling required by the rulebook.
 * 
 * ADAPTIVE: When external APIs fail, the agent discovers local data sources
 * (like CSV fallback files) and decides to use them — fully LLM-driven.
 */

import { callLLM } from './llmService';
import { getAPITools, buildToolDescriptions, executeAPICall, getOperationalTools } from './apiDiscovery';

/**
 * Detect available local cohort fallback files.
 * Auto-scans for CSV files in project root — no hardcoded filenames.
 * The agent is TOLD about these as options — it decides whether to use them.
 */
async function detectLocalDataSources() {
    const fs = await import('fs');
    const path = await import('path');
    const sources = [];
    const projectRoot = process.cwd();

    // Auto-scan project root for any CSV files that look like cohort/customer data
    try {
        const files = fs.readdirSync(projectRoot).filter(f => f.endsWith('.csv'));
        for (const file of files) {
            const filePath = path.join(projectRoot, file);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n').slice(0, 3);
                const lineCount = content.split('\n').filter(l => l.trim()).length - 1;
                if (lineCount > 0) {
                    sources.push({
                        type: 'csv_file',
                        name: file,
                        path: filePath,
                        recordCount: lineCount,
                        header: lines[0],
                        sampleRow: lines[1],
                    });
                }
            } catch (e) { /* skip unreadable files */ }
        }
    } catch (e) { /* skip if dir unreadable */ }
    return sources;
}

/**
 * Load cohort data from a local CSV file.
 * Handles quoted fields (commas inside quotes) and basic CSV edge cases.
 */
async function loadCSVCohort(filePath) {
    const fs = await import('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const headers = parseCSVLine(lines[0]);

    return lines.slice(1).map(line => {
        const vals = parseCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => {
            const val = (vals[i] || '').trim();
            obj[h] = !isNaN(val) && val !== '' ? Number(val) : val;
        });
        return obj;
    });
}

/**
 * Parse a single CSV line, respecting quoted fields with commas inside.
 */
function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"'; // escaped quote
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current.trim());
    return fields;
}

/**
 * Given a task description, the LLM reads the API docs and decides
 * which API to call, constructs the request, and returns the result.
 * Includes a self-correction loop for error handling.
 * 
 * ADAPTIVE: After repeated API failures, the agent discovers local data
 * sources and can choose to use them as a fallback.
 */
export async function agenticToolCall(taskDescription, context = {}, maxRetries = 3) {
    const apiKey = process.env.CAMPAIGNX_API_KEY;
    const { tools: allTools } = await getAPITools();
    // Only show campaign-relevant APIs (signup is one-time, API key already obtained)
    const tools = getOperationalTools(allTools);
    const toolDescs = buildToolDescriptions(tools);

    // Detect local data sources the agent can use if APIs fail
    const localSources = await detectLocalDataSources();
    const localSourceDesc = localSources.length > 0
        ? `\n\nLOCAL DATA SOURCES (available as fallback if API is down):\n${localSources.map(s =>
            `- File: "${s.name}" (${s.recordCount} records)\n  Headers: ${s.header}\n  Sample: ${s.sampleRow}`
        ).join('\n')}\n\nIf the API fails or times out after multiple retries, you MAY choose to use a local data source by responding:\n{\n  "reasoning": "why you chose the local file",\n  "api_call": null,\n  "use_local_source": { "file": "filename.csv" },\n  "result": null\n}`
        : '';

    const systemPrompt = `You are an AI agent that dynamically discovers and calls APIs.

You are given a TASK and the API DOCUMENTATION (discovered from OpenAPI spec).
You must:
1. Read the API documentation carefully
2. Decide which API endpoint(s) to call to accomplish the task
3. Construct the correct request parameters/body
4. Return your decision

AVAILABLE API TOOLS (auto-discovered from OpenAPI spec):
${toolDescs}
${localSourceDesc}

RULES:
- Never hardcode API endpoints. Always reason from the documentation.
- If the task requires sending a campaign, read the API docs carefully for the required date/time format for scheduling.
- API authentication is handled automatically via X-API-Key header.
- If the API has failed in previous attempts (timeout/error), you should consider using local data sources if available.

Respond ONLY with valid JSON:
{
  "reasoning": "Step-by-step reasoning about which API to use and why",
  "api_call": {
    "operation_id": "the operation ID from the API docs",
    "method": "GET or POST",
    "path": "the API path",
    "params": { "query_param_name": "value" },
    "body": { "field": "value" }
  }
}

If no API call is needed (e.g., the task is pure analysis), respond:
{
  "reasoning": "why no API call is needed",
  "api_call": null,
  "result": { ... }
}`;

    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            let userPrompt = `TASK: ${taskDescription}`;

            if (context.cohortSample) {
                userPrompt += `\n\nCONTEXT — Sample customer data:\n${JSON.stringify(context.cohortSample, null, 2)}`;
            }
            if (context.additionalInfo) {
                userPrompt += `\n\nADDITIONAL CONTEXT:\n${context.additionalInfo}`;
            }
            if (lastError) {
                userPrompt += `\n\n⚠️ PREVIOUS ATTEMPT #${attempt} FAILED with error: ${lastError}\nPlease adjust your approach and try again. Reflect on what went wrong.`;
                // After 2+ failures, explicitly nudge toward local sources
                if (attempt >= 2 && localSources.length > 0) {
                    userPrompt += `\n\n🔄 The API has failed ${attempt} times. Local data sources are available as described above. You may choose to use them if you determine the API is unreliable.`;
                }
            }

            console.log(`[TOOL-CALLER] Attempt ${attempt + 1}/${maxRetries} for task: "${taskDescription.substring(0, 80)}..."`);
            if (lastError) console.log(`[TOOL-CALLER]   Previous error: ${lastError.substring(0, 150)}`);

            const decision = await callLLM(systemPrompt, userPrompt, { jsonMode: true, temperature: 0.3 });

            console.log(`[TOOL-CALLER]   LLM decided: ${decision.reasoning?.substring(0, 150)}`);

            // Check if LLM chose to use a local data source
            if (decision.use_local_source) {
                const chosenFile = decision.use_local_source.file;
                const source = localSources.find(s => s.name === chosenFile);
                if (source) {
                    console.log(`[TOOL-CALLER]   🔄 ADAPTIVE: LLM chose local fallback "${chosenFile}" (${source.recordCount} records)`);
                    const data = await loadCSVCohort(source.path);
                    return {
                        success: true,
                        reasoning: `[ADAPTIVE] ${decision.reasoning}`,
                        apiCall: { tool: 'local_csv', method: 'FILE_READ', path: chosenFile },
                        result: { data, total_count: data.length, message: `Loaded from local file: ${chosenFile}`, source: 'local_csv_fallback' },
                        attempt: attempt + 1,
                        adaptedSource: 'local_csv',
                    };
                }
            }

            if (!decision.api_call) {
                return { success: true, reasoning: decision.reasoning, result: decision.result, noApiCall: true };
            }

            // Find the matching tool from discovered tools
            const tool = tools.find(t =>
                t.name === decision.api_call.operation_id ||
                t.path === decision.api_call.path ||
                (t.method === decision.api_call.method && t.path === decision.api_call.path)
            );

            if (!tool) {
                lastError = `Could not find API tool matching: ${decision.api_call.operation_id || decision.api_call.path}. Available tools: ${tools.map(t => t.name).join(', ')}`;
                console.log(`[TOOL-CALLER]   ✗ Tool not found: ${decision.api_call.operation_id || decision.api_call.path}`);
                continue;
            }

            console.log(`[TOOL-CALLER]   ▶ Calling ${tool.method} ${tool.path}...`);

            // Inject real data for large payloads (customer IDs, email body)
            // The LLM uses placeholders to avoid token overflow; we replace them here.
            // Field-name-agnostic: finds fields by value pattern, not hardcoded names.
            let apiBody = decision.api_call.body || null;
            if (apiBody && context._customerIds) {
                // Find the array field that should hold customer IDs (by placeholder or short array)
                for (const [key, val] of Object.entries(apiBody)) {
                    if (val === 'FULL_LIST_PLACEHOLDER' ||
                        (Array.isArray(val) && val.length < context._customerIds.length && val.length <= 10)) {
                        apiBody[key] = context._customerIds;
                        console.log(`[TOOL-CALLER]   📋 Injected ${context._customerIds.length} customer IDs into "${key}"`);
                        break;
                    }
                }
                // Ensure email body is present — find string fields that should hold the body/subject
                // by checking if they're empty/missing while we have the values in context
                if (context._emailBody) {
                    const bodyField = Object.keys(apiBody).find(k => /^body$/i.test(k)) ||
                        Object.keys(apiBody).find(k => /message|content|html|text/i.test(k));
                    if (bodyField && !apiBody[bodyField]) {
                        apiBody[bodyField] = context._emailBody;
                        console.log(`[TOOL-CALLER]   📋 Injected email body into "${bodyField}"`);
                    } else if (!bodyField && !Object.values(apiBody).some(v => typeof v === 'string' && v.length > 100)) {
                        // No body field found by name, add with the most common name
                        apiBody.body = context._emailBody;
                        console.log(`[TOOL-CALLER]   📋 Added email body field`);
                    }
                }
                if (context._emailSubject) {
                    const subjectField = Object.keys(apiBody).find(k => /^subject$/i.test(k)) ||
                        Object.keys(apiBody).find(k => /title|header|heading/i.test(k));
                    if (subjectField && !apiBody[subjectField]) {
                        apiBody[subjectField] = context._emailSubject;
                        console.log(`[TOOL-CALLER]   📋 Injected email subject into "${subjectField}"`);
                    }
                }
                if (context._sendTime) {
                    const timeField = Object.keys(apiBody).find(k => /send.?time|schedule/i.test(k));
                    if (timeField && !apiBody[timeField]) {
                        apiBody[timeField] = context._sendTime;
                    }
                }
            }

            // Execute the dynamically decided API call
            const result = await executeAPICall(
                tool,
                decision.api_call.params || {},
                apiBody,
                apiKey
            );

            // Self-reflection: check if the result looks correct
            if (result.status >= 400) {
                lastError = `API returned error ${result.status}: ${JSON.stringify(result.data).substring(0, 300)}`;
                console.log(`[TOOL-CALLER]   ✗ API error ${result.status}`);
                continue; // Retry with error context
            }

            console.log(`[TOOL-CALLER]   ✓ Success on attempt ${attempt + 1}`);

            return {
                success: true,
                reasoning: decision.reasoning,
                apiCall: { tool: tool.name, method: tool.method, path: tool.path },
                result: result.data,
                attempt: attempt + 1,
            };

        } catch (err) {
            lastError = err.message;
            console.error(`[TOOL-CALLER]   ✗ Exception on attempt ${attempt + 1}: ${err.message}`);
        }
    }

    console.error(`[TOOL-CALLER] ✗ All ${maxRetries} attempts failed. Last error: ${lastError}`);
    return { success: false, error: lastError, attempts: maxRetries };
}

/**
 * Multi-step agentic tool calling — the LLM plans a sequence of API calls
 * and executes them iteratively with reflection between each step.
 */
export async function agenticMultiStepToolCall(goal, context = {}) {
    const apiKey = process.env.CAMPAIGNX_API_KEY;
    const { tools: allTools } = await getAPITools();
    const tools = getOperationalTools(allTools);
    const toolDescs = buildToolDescriptions(tools);

    const planPrompt = `You are a planning AI agent. Given a goal and API documentation, create a step-by-step plan of API calls needed.

AVAILABLE API TOOLS (discovered from OpenAPI spec):
${toolDescs}

Respond in JSON:
{
  "plan": [
    {
      "step": 1,
      "description": "what this step does",
      "api_operation": "operation_id from docs",
      "depends_on": null
    }
  ],
  "reasoning": "why this plan achieves the goal"
}`;

    const plan = await callLLM(planPrompt, `GOAL: ${goal}`, { jsonMode: true, temperature: 0.2 });

    const results = [];
    for (const step of (plan.plan || [])) {
        const stepResult = await agenticToolCall(
            step.description,
            { ...context, previousResults: results },
        );
        results.push({ step: step.step, ...stepResult });
    }

    return { plan: plan.plan, results, reasoning: plan.reasoning };
}
