/**
 * Optimization Agent — Autonomous re-planning and campaign relaunch.
 * Uses schema-driven approach: LLM outputs segmentation RULES, executed locally.
 * Receives compact reportSummary (pure JS, ~100 tokens) instead of raw analysis dumps.
 * Uses Value Discovery to constrain the LLM to real field names and values.
 * Uses llama-3.1-8b-instant for fast, cheap structured reflection.
 */

import { callLLM } from './llmService';
import { executeSegmentationRules } from './ruleEngine';
import { discoverSegmentationValues, formatDiscoveryForLLM } from './valueDiscovery';

export async function optimizationAgent(brief, analysis, originalStrategy, cohortData, cohortSummary) {
    // Use compact reportSummary (pure JS, ~100 tokens) — NOT the full analysis dump
    const reportSummary = analysis.reportSummary || {
        openRate: analysis.overallPerformance?.openRate || 0,
        clickRate: analysis.overallPerformance?.clickRate || 0,
        totalSent: analysis.overallPerformance?.totalSent || 0,
        insight: 'No summary available. Assume broad segments caused low engagement.',
    };

    // ── WINNING PATTERN LOCK ──────────────────────────────────────────────────
    // If already performing well, don't change the formula — only add personalization & tighter segments
    const isWinning = (reportSummary.openRate > 25) && (reportSummary.clickRate > 15);
    const winningLockNote = isWinning
        ? `\n🏆 WINNING PATTERN DETECTED (open ${reportSummary.openRate}%, click ${reportSummary.clickRate}%):
RULE: Do NOT change the subject/body formula — it is working.
ONLY: (1) add {{First_Name}} to ALL subjects, (2) create 8-10 even tighter micro-segments, (3) differentiate send times more precisely.
Predicted lift: +8-12% open from name personalization alone.\n`
        : '';

    // Value Discovery — extract real field names, valid values, and buckets from data
    const discovery = discoverSegmentationValues(cohortData);
    const discoveryText = formatDiscoveryForLLM(discovery);

    const systemPrompt = `You are an autonomous Indian BFSI campaign optimization AI for SuperBFSI XDeposit. Your job is to self-improve campaigns by diagnosing failure and rebuilding micro-segments.
${winningLockNote}
STEP 1 — DIAGNOSE root cause (pick one or more):
- "broad_segments": segments too generic (fix: 6-8 tighter micro-segments)
- "weak_subjects": subjects didn't include 1.25%, too long, or no urgency
- "wrong_send_time": sent at non-optimal time for the demographic
- "poor_cta": body too long, CTA too buried, no bold on 1.25%
- "no_personalization": Full_name field exists but subjects had no first-name prefix
- "multiple": list all applicable

STEP 2 — PRODUCE EXACTLY 6 TO 8 NEW MICRO-SEGMENTS.
Use ONLY the discovered fields and values provided below. Do NOT invent field names or values.
- Combine at least 2-3 fields per segment (AND logic)
- Maharashtra (Mumbai, Pune, Nagpur): send at 09:00
- Female 60+: warm tone + send at 10:00
- High-income professional (41-65): professional tone + send at 09:30
- Young savers (18-35): aspirational tone + send at 19:30
- Default: 11:00

STEP 3 — PERSONALIZATION RULE (mandatory if Full_name exists in cohort):
- ALL subjects must begin with {{First_Name}}, e.g.: "{{First_Name}}, Earn 1.25% More 💰"
- This adds 8-12% open lift in Indian BFSI — do not skip this

STEP 4 — CONTENT RULES for newSubject/newBody:
- Subject: 35-55 chars total (including {{First_Name}}, prefix), contains "1.25%", max 1 emoji at end
- Body: <200 words, bold **1.25% higher returns**, CTA button, "Reply for personalized advice" sign-off

Segmentation operators: equals, not_equals, in, not_in, between, not_between, gt, gte, lt, lte, contains
IMPORTANT: The "values" field in each rule MUST be a JSON array, e.g. ["Female"] not "Female", [41, 65] not "41-65".
Output valid JSON only.`;

    const userPrompt = `Original Brief: "${brief}"

PREVIOUS CAMPAIGN PERFORMANCE (compact summary):
${JSON.stringify(reportSummary, null, 2)}

Original Strategy (${(originalStrategy.segments || []).length} segments):
${JSON.stringify((originalStrategy.segments || []).map(s => ({ name: s.name, count: s.count, tone: s.recommendedTone })), null, 2)}

DISCOVERED SEGMENTATION ATTRIBUTES (use ONLY these):
${discoveryText}

Diagnose the failure and produce 6-8 sharp NEW micro-segments using ONLY the fields and values above.
REMINDER: "values" MUST be a JSON array: ["Female"], [41, 65], ["Mumbai", "Pune"]. Never a bare string or number.

{
  "rootCause": "broad_segments|weak_subjects|wrong_send_time|poor_cta|multiple",
  "rootCauseExplanation": "1-2 sentence specific diagnosis",
  "optimizationType": "micro_segmentation|content_refresh|timing_adjustment|full_relaunch",
  "reasoning": "detailed optimization rationale",
  "newSegments": [
    {
      "name": "descriptive micro-segment name (e.g. High-Income Female Mumbai 41-65)",
      "description": "why this slice and expected engagement",
      "rules": [
        { "field": "exact_field_from_discovery", "operator": "between|in|equals|gte|lte", "values": ["..."] },
        { "field": "second_field", "operator": "equals", "values": ["value"] }
      ],
      "recommendedTone": "warm|professional|urgent|aspirational",
      "recommendedSendTime": "HH:MM",
      "newSubject": "subject 35-55 chars with 1.25% and max 1 emoji",
      "newBody": "body under 200 words, bold 1.25%, CTA button, Reply sign-off",
      "predictedLift": "Open rate will rise by X% because this slice has high behavioral intent signals"
    }
  ],
  "expectedImprovement": { "openRate": "+X%", "clickRate": "+X%" },
  "changes": ["specific change 1", "specific change 2"],
  "humanApprovalRequired": true
}`;

    const optimization = await callLLM(systemPrompt, userPrompt, {
        jsonMode: true,
        temperature: 0.5,
        model: 'llama-3.1-8b-instant', // Faster + cheaper for structured reflection
    });

    // Execute segmentation rules locally — no raw data was ever sent to LLM
    if (optimization.newSegments && cohortData && cohortData.length > 0) {
        optimization.newSegments = executeSegmentationRules(optimization.newSegments, cohortData);
    }

    console.log(`[OPTIMIZATION] Root cause: ${optimization.rootCause}. New segments: ${optimization.newSegments?.length || 0}. Expected open lift: ${optimization.expectedImprovement?.openRate}`);
    return optimization;
}
