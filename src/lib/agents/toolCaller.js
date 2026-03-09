/**
 * Tool Caller Agent — The LLM reads API documentation and dynamically
 * decides which endpoint to call. NO hardcoded operation IDs.
 * This is the TRUE agentic tool calling required by the rulebook.
 */

import { callLLM } from './llmService';
import { getAPITools, buildToolDescriptions, executeAPICall, getOperationalTools } from './apiDiscovery';

/**
 * Given a task description, the LLM reads the API docs and decides
 * which API to call, constructs the request, and returns the result.
 * Includes a self-correction loop for error handling.
 */
export async function agenticToolCall(taskDescription, context = {}, maxRetries = 3) {
    const apiKey = process.env.CAMPAIGNX_API_KEY;
    const { tools: allTools } = await getAPITools();
    // Only show campaign-relevant APIs (signup is one-time, API key already obtained)
    const tools = getOperationalTools(allTools);
    const toolDescs = buildToolDescriptions(tools);

    const systemPrompt = `You are an AI agent that dynamically discovers and calls APIs.

You are given a TASK and the API DOCUMENTATION (discovered from OpenAPI spec).
You must:
1. Read the API documentation carefully
2. Decide which API endpoint(s) to call to accomplish the task
3. Construct the correct request parameters/body
4. Return your decision

AVAILABLE API TOOLS (auto-discovered from OpenAPI spec):
${toolDescs}

RULES:
- Never hardcode API endpoints. Always reason from the documentation.
- If the task requires sending a campaign, the send_time must be in format 'DD:MM:YY HH:MM:SS' (IST) and must be a future time.
- API authentication is handled automatically via X-API-Key header.

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
                userPrompt += `\n\n⚠️ PREVIOUS ATTEMPT FAILED with error: ${lastError}\nPlease adjust your approach and try again. Reflect on what went wrong.`;
            }

            const decision = await callLLM(systemPrompt, userPrompt, { jsonMode: true, temperature: 0.3 });

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
                continue;
            }

            // Execute the dynamically decided API call
            const result = await executeAPICall(
                tool,
                decision.api_call.params || {},
                decision.api_call.body || null,
                apiKey
            );

            // Self-reflection: check if the result looks correct
            if (result.status >= 400) {
                lastError = `API returned error ${result.status}: ${JSON.stringify(result.data)}`;
                continue; // Retry with error context
            }

            return {
                success: true,
                reasoning: decision.reasoning,
                apiCall: { tool: tool.name, method: tool.method, path: tool.path },
                result: result.data,
                attempt: attempt + 1,
            };

        } catch (err) {
            lastError = err.message;
        }
    }

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
