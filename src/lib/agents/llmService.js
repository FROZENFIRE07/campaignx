/**
 * LLM Service - Groq integration for all agent reasoning
 */

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function callLLM(systemPrompt, userPrompt, options = {}) {
    const { temperature = 0.7, maxTokens = 4096, jsonMode = false } = options;

    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];

        const config = {
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature,
            max_tokens: maxTokens,
        };

        if (jsonMode) {
            config.response_format = { type: 'json_object' };
        }

        const completion = await groq.chat.completions.create(config);
        const content = completion.choices[0]?.message?.content || '';

        if (jsonMode) {
            try {
                return JSON.parse(content);
            } catch {
                // Try to extract JSON from the response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) return JSON.parse(jsonMatch[0]);
                return { error: 'Failed to parse JSON', raw: content };
            }
        }

        return content;
    } catch (error) {
        console.error('LLM call failed:', error.message);
        throw error;
    }
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
