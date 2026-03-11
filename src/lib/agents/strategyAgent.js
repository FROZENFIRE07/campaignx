/**
 * Strategy Agent — Schema-driven segmentation strategy.
 * 
 * KEY DESIGN PRINCIPLE: Raw customer data NEVER reaches the LLM.
 * The LLM receives only schema metadata (field names, types, distributions)
 * and outputs structured segmentation RULES that are executed locally.
 * 
 * This makes the system:
 * - Token-efficient (metadata is ~50 lines vs thousands of rows)
 * - Adaptive to any cohort schema changes
 * - Privacy-respecting (no PII in LLM prompts)
 */

import { callLLM } from './llmService';
import { analyzeSchema, formatSchemaForLLM } from './schemaAnalyzer';
import { executeSegmentationRules } from './ruleEngine';

/**
 * Main strategy agent entry point.
 * 
 * @param {string} brief - Campaign brief
 * @param {Object[]} cohortData - Full cohort data (used ONLY for local rule execution, never sent to LLM)
 * @param {string} toolDescriptions - API tool descriptions
 * @param {Object} [precomputedSchema] - Schema metadata (if already computed by orchestrator)
 * @returns {Object} Strategy with segments, each containing customerIds from local rule execution
 */
export async function strategyAgent(brief, cohortData, toolDescriptions, precomputedSchema = null) {
    // Step 1: Analyze schema (or use precomputed)
    const schema = precomputedSchema || analyzeSchema(cohortData);
    const schemaText = formatSchemaForLLM(schema);

    console.log(`[STRATEGY] Schema analysis: ${schema.totalRecords} records, ${schema.fields.length} fields`);
    console.log(`[STRATEGY] Schema text for LLM (${schemaText.length} chars):`);
    console.log(schemaText);

    // Step 2: LLM sees ONLY schema metadata — no raw data, no sample rows
    const systemPrompt = `You are a senior digital marketing strategist AI agent. You analyze customer cohort METADATA and create optimal segmentation strategies for email marketing.

CRITICAL: You will receive ONLY schema-level metadata about the customer dataset — field names, types, value distributions, and statistics. You will NOT see any raw customer records. Your job is to propose segmentation RULES that the system will execute locally on the full dataset.

IMPORTANT CONTEXT:
- This is an email campaign for SuperBFSI, an Indian BFSI service provider
- Campaign performance depends on: customer demography, behavioral segmentation, time slot, email content (style, tone, font, length)
- You must optimize for open rate and click rate
- Use A/B testing methodology for strategy optimization
- The cohort schema may change at any time — only reference fields that actually exist in the metadata

Available API tools (discovered from OpenAPI spec):
${toolDescriptions}

SEGMENTATION RULES FORMAT:
Each rule targets a specific field with an operator and value(s).
Supported operators: equals, in, between, gt, gte, lt, lte, contains, not_in, not_equals
- "between" requires values: [min, max] (inclusive)
- "in" requires values: ["val1", "val2", ...]
- "equals" requires values: ["single_value"]
- "gt"/"lt"/"gte"/"lte" require values: [threshold]

Rules within a segment are combined with AND logic.
Design segments so they cover the ENTIRE cohort with minimal overlap.

Always respond in valid JSON format.`;

    const userPrompt = `Campaign Brief: "${brief}"

CUSTOMER COHORT METADATA (${schema.totalRecords} total customers):
${schemaText}

Based on this metadata, create a segmentation strategy. Output structured rules — NOT customer IDs.
The system will execute your rules locally against the full dataset.

{
  "segments": [
    {
      "name": "segment name",
      "description": "why this segment and what characterizes them",
      "rules": [
        { "field": "exact_field_name_from_metadata", "operator": "between|in|equals|gt|lt|gte|lte|contains", "values": ["..."] }
      ],
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
  "reasoning": "step-by-step reasoning for this strategy based on the cohort metadata"
}`;

    const strategy = await callLLM(systemPrompt, userPrompt, { jsonMode: true, temperature: 0.6 });

    // Step 3: Execute the LLM's rules locally on the full dataset — no data leaves the system
    if (strategy.segments) {
        console.log(`[STRATEGY] LLM proposed ${strategy.segments.length} segments — executing rules locally`);
        strategy.segments = executeSegmentationRules(strategy.segments, cohortData);

        // Log results
        for (const seg of strategy.segments) {
            console.log(`[STRATEGY]   "${seg.name}": ${seg.count} customers matched`);
        }
        const totalAssigned = strategy.segments.reduce((sum, s) => sum + (s.count || 0), 0);
        console.log(`[STRATEGY] Total assigned: ${totalAssigned}/${cohortData.length} (${Math.round(totalAssigned / cohortData.length * 100)}%)`);
    }

    return strategy;
}
