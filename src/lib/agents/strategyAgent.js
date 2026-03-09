/**
 * Strategy Agent - Analyzes cohort demographics and creates campaign segmentation strategy
 */

import { callLLM } from './llmService';

export async function strategyAgent(brief, cohortData, toolDescriptions) {
    // Analyze cohort demographics 
    const cohortSummary = analyzeCohort(cohortData);

    const systemPrompt = `You are a senior digital marketing strategist AI agent. You analyze customer cohorts and create optimal campaign strategies for email marketing.

You must think adaptively — the customer cohort may change at any time. Your strategy must be based ONLY on the actual data provided, never on assumptions or cached information.

IMPORTANT CONTEXT:
- This is an email campaign for SuperBFSI, an Indian BFSI service provider
- Campaign performance depends on: customer demography, behavioral segmentation, time slot, email content (style, tone, font, length)
- You must optimize for open rate and click rate
- Use A/B testing methodology for strategy optimization

Available API tools (discovered from OpenAPI spec):
${toolDescriptions}

Always respond in valid JSON format.`;

    const userPrompt = `Campaign Brief: "${brief}"

Customer Cohort Summary (${cohortData.length} customers):
${JSON.stringify(cohortSummary, null, 2)}

Sample customers (first 10):
${JSON.stringify(cohortData.slice(0, 10), null, 2)}

Create a comprehensive campaign strategy with the following JSON structure:
{
  "segments": [
    {
      "name": "segment name",
      "description": "why this segment",
      "criteria": { "field": "value" },
      "customerIds": ["CUST001", ...],
      "count": 100,
      "recommendedTone": "professional/casual/urgent/warm",
      "recommendedSendTime": "HH:MM in IST",
      "priority": "high/medium/low"
    }
  ],
  "abTestPlan": {
    "description": "A/B testing approach",
    "variables": ["content_style", "send_time", "subject_line"]
  },
  "overallStrategy": "description of the overall strategy",
  "reasoning": "step-by-step reasoning for this strategy"
}`;

    const strategy = await callLLM(systemPrompt, userPrompt, { jsonMode: true, temperature: 0.6 });

    // Map actual customer IDs to segments
    if (strategy.segments) {
        strategy.segments = mapCustomerIdsToSegments(strategy.segments, cohortData);
    }

    return strategy;
}

function analyzeCohort(cohortData) {
    if (!cohortData || cohortData.length === 0) return { empty: true };

    const summary = {
        totalCustomers: cohortData.length,
        fields: Object.keys(cohortData[0] || {}),
        demographics: {},
    };

    // Analyze each field
    for (const field of summary.fields) {
        if (field === 'customer_id' || field === 'Email_ID') continue;
        const values = cohortData.map(c => c[field]).filter(Boolean);
        const counts = {};
        values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });

        const uniqueValues = Object.keys(counts).length;
        if (uniqueValues <= 20) {
            summary.demographics[field] = counts;
        } else {
            summary.demographics[field] = {
                uniqueCount: uniqueValues,
                sample: Object.entries(counts).slice(0, 10).map(([k, v]) => `${k}: ${v}`)
            };
        }
    }

    return summary;
}

function mapCustomerIdsToSegments(segments, cohortData) {
    return segments.map(segment => {
        if (segment.customerIds && segment.customerIds.length > 0) return segment;

        // Try to match customers based on criteria
        const criteria = segment.criteria || {};
        let matched = cohortData;

        for (const [field, value] of Object.entries(criteria)) {
            if (typeof value === 'string') {
                matched = matched.filter(c => {
                    const cv = String(c[field] || '').toLowerCase();
                    return cv.includes(value.toLowerCase()) || value.toLowerCase().includes(cv);
                });
            }
        }

        // If no matches found, assign a portion of the cohort
        if (matched.length === 0) {
            const segIndex = segments.indexOf(segment);
            const chunkSize = Math.ceil(cohortData.length / segments.length);
            matched = cohortData.slice(segIndex * chunkSize, (segIndex + 1) * chunkSize);
        }

        segment.customerIds = matched.map(c => c.customer_id);
        segment.count = segment.customerIds.length;
        return segment;
    });
}
