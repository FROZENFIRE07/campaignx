/**
 * LLM Service - Groq integration for all agent reasoning
 */

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 60000 });

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientLLMError(error) {
    const message = String(error?.message || '').toLowerCase();
    const causeCode = String(error?.cause?.code || '').toUpperCase();
    return message.includes('connection error') ||
        message.includes('fetch failed') ||
        message.includes('timeout') ||
        ['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes(causeCode);
}

export async function callLLM(systemPrompt, userPrompt, options = {}) {
    const { temperature = 0.7, maxTokens = 4096, jsonMode = false, model = 'llama-3.3-70b-versatile' } = options;
    const maxAttempts = Math.max(1, Number(process.env.LLM_MAX_ATTEMPTS || 2));
    const retryDelayMs = Math.max(200, Number(process.env.LLM_RETRY_DELAY_MS || 800));

    const startTime = Date.now();
    const promptPreview = userPrompt.substring(0, 80).replace(/\n/g, ' ');
    console.log(`[LLM] >> Calling Groq (model: ${model}, json: ${jsonMode}, temp: ${temperature})`);
    console.log(`[LLM]    Prompt: "${promptPreview}..."`);

    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ];

            const config = {
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
            };

            if (jsonMode) {
                config.response_format = { type: 'json_object' };
            }

            const completion = await groq.chat.completions.create(config);
            const content = completion.choices[0]?.message?.content || '';
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const usage = completion.usage;
            console.log(`[LLM] << Response in ${elapsed}s (tokens: ${usage?.prompt_tokens || '?'}→${usage?.completion_tokens || '?'}, total: ${usage?.total_tokens || '?'})`);

            if (jsonMode) {
                try {
                    return JSON.parse(content);
                } catch {
                    // Try to extract JSON from the response
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) return JSON.parse(jsonMatch[0]);
                    console.error('[LLM] !! Non-JSON response:', content.substring(0, 200));
                    return { error: 'Failed to parse JSON', raw: content };
                }
            }

            return content;
        } catch (error) {
            lastError = error;
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            console.error(`[LLM] !! ERROR after ${elapsed}s: ${error.message}`);

            // Surface rate limit and token limit errors explicitly
            if (error.status === 429) {
                throw new Error('LLM rate limited — too many requests. Please wait and retry.');
            }
            if (error.status === 413 || error.message?.includes('token')) {
                throw new Error('LLM token limit exceeded — prompt too large. Reduce cohort sample size.');
            }

            if (attempt < maxAttempts && isTransientLLMError(error)) {
                const backoffMs = retryDelayMs * attempt;
                console.log(`[LLM] .. transient error, retrying (${attempt}/${maxAttempts}) after ${backoffMs}ms`);
                await sleep(backoffMs);
                continue;
            }

            throw error;
        }
    }

    throw lastError || new Error('LLM call failed');
}

export async function callLLMWithTools(systemPrompt, userPrompt, toolDescriptions) {
    const enhancedSystem = `${systemPrompt}

You have access to the following API tools (discovered dynamically from OpenAPI spec):
${toolDescriptions}

When you need to call an API, respond with a JSON object:
{
  "action": "api_call",
  "tool": "<operation_id>",
  "params": { ... },
  "body": { ... },
  "reasoning": "Why you're making this call"
}

When you have completed your analysis and don't need more API calls:
{
  "action": "complete",
  "result": { ... },
  "reasoning": "Summary of your analysis"
}`;

    return callLLM(enhancedSystem, userPrompt, { jsonMode: true });
}
