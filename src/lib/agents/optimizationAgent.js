/**
 * Optimization Agent — Autonomous re-planning and campaign relaunch.
 * Uses schema-driven approach: LLM outputs segmentation RULES, executed locally.
 */

import { callLLM } from './llmService';
import { executeSegmentationRules } from './ruleEngine';
import { analyzeSchema, formatSchemaForLLM } from './schemaAnalyzer';

export async function optimizationAgent(brief, analysis, originalStrategy, cohortData) {
    // Build schema metadata for LLM — no raw data in prompt
    const schema = analyzeSchema(cohortData || []);
    const schemaText = formatSchemaForLLM(schema);

    const systemPrompt = `You are an autonomous campaign optimization AI agent for SuperBFSI. Based on performance analysis, you create optimized campaign strategies.

Your optimization must:
1. Identify micro-segments from underperforming groups
2. Generate new content variants optimized for those segments
3. Adjust send times based on performance data
4. Recommend which segments to re-target

CRITICAL: You receive only schema metadata about the cohort — NOT raw customer data.
Output segmentation RULES (same format as strategy agent) for new segments.
The system will execute your rules locally against the full dataset.

Supported rule operators: equals, in, between, gt, gte, lt, lte, contains, not_in, not_equals

Respond in valid JSON format.`;

    const userPrompt = `Original Brief: "${brief}"

Performance Analysis:
${JSON.stringify(analysis, null, 2)}

Original Strategy Segments: ${JSON.stringify((originalStrategy.segments || []).map(s => ({ name: s.name, count: s.count })), null, 2)}

Current Cohort Metadata:
${schemaText}

Create an optimization plan with segmentation RULES (not customer IDs):
{
  "optimizationType": "micro_segmentation | content_refresh | timing_adjustment | full_relaunch",
  "reasoning": "detailed reasoning for optimization decisions",
  "newSegments": [
    {
      "name": "optimized segment name",
      "description": "why this micro-segment",
      "rules": [
        { "field": "exact_field_from_metadata", "operator": "between|in|equals|gt|lt", "values": ["..."] }
      ],
      "recommendedTone": "tone",
      "recommendedSendTime": "HH:MM IST",
      "newSubject": "optimized email subject",
      "newBody": "optimized email body with emojis, URL (https://superbfsi.com/xdeposit/explore/), and formatting"
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

    // Execute segmentation rules locally — no raw data was sent to LLM
    if (optimization.newSegments && cohortData && cohortData.length > 0) {
        optimization.newSegments = executeSegmentationRules(optimization.newSegments, cohortData);
    }

    return optimization;
}
