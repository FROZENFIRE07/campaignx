/**
 * Optimization Agent - Autonomous re-planning and campaign relaunch
 */

import { callLLM } from './llmService';

export async function optimizationAgent(brief, analysis, originalStrategy, cohortData) {
    const systemPrompt = `You are an autonomous campaign optimization AI agent for SuperBFSI. Based on performance analysis, you create optimized campaign strategies.

Your optimization must:
1. Identify micro-segments from underperforming groups
2. Generate new content variants optimized for those segments
3. Adjust send times based on performance data
4. Recommend which segments to re-target

CRITICAL: The customer cohort may have changed. Base all decisions on the actual data provided.

Respond in valid JSON format.`;

    const userPrompt = `Original Brief: "${brief}"

Performance Analysis:
${JSON.stringify(analysis, null, 2)}

Original Strategy Segments: ${JSON.stringify((originalStrategy.segments || []).map(s => ({ name: s.name, count: s.count })), null, 2)}

Create an optimization plan:
{
  "optimizationType": "micro_segmentation | content_refresh | timing_adjustment | full_relaunch",
  "reasoning": "detailed reasoning for optimization decisions",
  "newSegments": [
    {
      "name": "optimized segment name",
      "description": "why this micro-segment",
      "criteria": { "field": "value" },
      "recommendedTone": "tone",
      "recommendedSendTime": "HH:MM IST",
      "newSubject": "optimized email subject",
      "newBody": "optimized email body with emojis, URL (https://superbfsi.com/xdeposit/explore/), and formatting",
      "targetCustomerIds": "describe which customers to include"
    }
  ],
  "expectedImprovement": {
    "openRate": "+X%",
    "clickRate": "+X%"
  },
  "changes": ["change 1", "change 2"],
  "humanApprovalRequired": true
}`;

    const optimization = await callLLM(systemPrompt, userPrompt, { jsonMode: true, temperature: 0.5 });

    // Map customer IDs for new segments
    if (optimization.newSegments && cohortData) {
        optimization.newSegments = optimization.newSegments.map(seg => {
            const criteria = seg.criteria || {};
            let matched = [...cohortData];

            for (const [field, value] of Object.entries(criteria)) {
                if (typeof value === 'string') {
                    matched = matched.filter(c => {
                        const cv = String(c[field] || '').toLowerCase();
                        return cv.includes(value.toLowerCase());
                    });
                }
            }

            seg.customerIds = matched.map(c => c.customer_id);
            seg.count = seg.customerIds.length;
            return seg;
        });
    }

    return optimization;
}
