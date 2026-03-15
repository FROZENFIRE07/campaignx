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
import { analyzeSchema } from './schemaAnalyzer';
import { executeSegmentationRules } from './ruleEngine';
import { discoverSegmentationValues, formatDiscoveryForLLM } from './valueDiscovery';

export function computeCohortSummary(cohortData) {
    if (!cohortData || cohortData.length === 0) return null;
    let male = 0, female = 0;
    const ages = { '18-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
    const cityCounts = {};
    let totalIncome = 0, incomeCount = 0;
    let totalCredit = 0, creditCount = 0;
    let supportsPersonalization = false;
    const incomeBrackets = { 'low': 0, 'mid': 0, 'high': 0, 'very_high': 0 };
    const creditBuckets = { 'low': 0, 'medium': 0, 'high': 0 };

    // Detect field names case-insensitively
    const keys = Object.keys(cohortData[0]);
    const genderField = keys.find(k => k.toLowerCase() === 'gender');
    const ageField = keys.find(k => k.toLowerCase() === 'age');
    const cityField = keys.find(k => k.toLowerCase() === 'city' || k.toLowerCase() === 'location');
    const incomeField = keys.find(k => k.toLowerCase().includes('income'));
    const creditField = keys.find(k => k.toLowerCase().includes('credit'));
    const nameField = keys.find(k => /^name$|first_?name/i.test(k));

    if (nameField) supportsPersonalization = true;

    const incomes = cohortData.map(r => incomeField ? Number(r[incomeField]) : NaN).filter(v => !isNaN(v));
    const incomeP25 = incomes.length > 0 ? incomes.sort((a,b) => a-b)[Math.floor(incomes.length * 0.25)] : 0;
    const incomeP75 = incomes.length > 0 ? incomes[Math.floor(incomes.length * 0.75)] : 0;
    const incomeP90 = incomes.length > 0 ? incomes[Math.floor(incomes.length * 0.90)] : 0;

    for (const r of cohortData) {
        if (genderField) {
            const g = (String(r[genderField]) || '').toLowerCase();
            if (g === 'male' || g === 'm') male++;
            else if (g === 'female' || g === 'f') female++;
        }
        if (ageField) {
            const a = Number(r[ageField]);
            if (!isNaN(a)) {
                if (a >= 18 && a <= 35) ages['18-35']++;
                else if (a >= 36 && a <= 50) ages['36-50']++;
                else if (a >= 51 && a <= 65) ages['51-65']++;
                else if (a > 65) ages['65+']++;
            }
        }
        if (cityField) {
            const c = String(r[cityField] || '');
            if (c) cityCounts[c] = (cityCounts[c] || 0) + 1;
        }
        if (incomeField) {
            const inc = Number(r[incomeField]);
            if (!isNaN(inc)) {
                totalIncome += inc;
                incomeCount++;
                if (inc <= incomeP25) incomeBrackets.low++;
                else if (inc <= incomeP75) incomeBrackets.mid++;
                else if (inc <= incomeP90) incomeBrackets.high++;
                else incomeBrackets.very_high++;
            }
        }
        if (creditField) {
            const cred = Number(r[creditField]);
            if (!isNaN(cred)) {
                totalCredit += cred;
                creditCount++;
                if (cred < 600) creditBuckets.low++;
                else if (cred < 750) creditBuckets.medium++;
                else creditBuckets.high++;
            }
        }
    }

    const topCities = Object.entries(cityCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e[0]);
    const maharashtraCities = ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane', 'Solapur'];
    const maharashtraCount = Object.entries(cityCounts).filter(([c]) => maharashtraCities.some(mc => c.toLowerCase().includes(mc.toLowerCase()))).reduce((s, [, v]) => s + v, 0);

    return {
        totalCustomers: cohortData.length,
        genderDistribution: { male, female },
        ageBuckets: ages,
        topCities,
        maharashtraCount,
        avgIncome: incomeCount > 0 ? Math.round(totalIncome / incomeCount) : 0,
        avgCreditScore: creditCount > 0 ? Math.round(totalCredit / creditCount) : 0,
        incomeBrackets,
        creditBuckets,
        supportsPersonalization,
    };
}

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

    // Step 1.5: Value Discovery — extract valid segmentation values from data
    const discovery = discoverSegmentationValues(cohortData, schema);
    const discoveryText = formatDiscoveryForLLM(discovery);

    console.log(`[STRATEGY] Schema analysis: ${schema.totalRecords} records, ${schema.fields.length} fields`);
    console.log(`[STRATEGY] Value Discovery (${discoveryText.length} chars):`);
    console.log(discoveryText);

    // Step 2: LLM sees ONLY discovered values — no raw data, no sample rows
    const systemPrompt = `You are a senior Indian BFSI digital marketing strategist AI. You analyze customer cohort METADATA and create hyper-targeted micro-segmentation strategies for email marketing.

CRITICAL: You will receive a list of DISCOVERED segmentation attributes with their exact valid values. Use ONLY these field names and values — do NOT invent or guess any others.

INDIAN BFSI CONTEXT (SuperBFSI XDeposit term deposit campaign):
- Indian BFSI open rate benchmark: 27% (behavior-based campaigns hit 42% — your target)
- Generic/broadcast campaigns stay at 14-17% — AVOID broad segments
- Maharashtra customers have 35% higher BFSI product conversion than national average
- Female senior citizens (60+) respond 2x better to warm, personalized messaging about security and returns
- High-income professionals (income top 25%) respond to professional, ROI-focused messaging
- Young savers (18-35) respond to aspirational, app-integrated, quick-win messaging

SEGMENTATION MANDATE — YOU MUST CREATE EXACTLY 6 TO 8 MICRO-SEGMENTS:
1. Use EVERY available segmentable field from the discovery below
2. Behavioral fields (Y/N flags) DOUBLE the segment priority — combine with demographics
3. Do NOT create catch-all or generic segments — every segment must have at least 2 specific rules (but no more than 3 rules to keep segments broad enough)
4. Segments SHOULD overlap — a customer may appear in multiple segments (deduplication happens at send time). Aim for 85-90%+ cohort coverage across all segments combined BEFORE any catch-all
5. Order by EXPECTED ENGAGEMENT: highest first
6. Each segment MUST target at least 5% of the cohort. Segments narrower than 5% will be automatically merged — avoid hyper-narrow combinations that match <3% of cohort. Prefer 2-rule segments over 4+ rule segments

MANDATORY PER-SEGMENT SEND TIMES (IST) — use these exactly:
- Age 60+ (seniors): 10:00
- Age 41-65, high income (professionals): 09:30
- Age 18-35 (young savers): 19:30
- Female any age: 10:30
- Maharashtra cities (Mumbai, Pune, Nagpur): 09:00
- All others: 11:00

Available API tools:
${toolDescriptions}

SEGMENTATION RULES FORMAT:
Supported operators: equals, in, between, gt, gte, lt, lte, contains, not_in, not_equals
- "between" requires values: [min, max] (inclusive)
- "in" requires values: ["val1", "val2", ...]
- "equals" requires values: ["single_value"]
- "values" MUST always be a JSON array

Rules within a segment use AND logic. Respond in valid JSON only.`;

    const userPrompt = `Campaign Brief: "${brief}"

DISCOVERED SEGMENTATION ATTRIBUTES (${discovery.totalRecords} total customers):
${discoveryText}

YOU MUST CREATE EXACTLY 6 TO 8 MICRO-SEGMENTS. Fewer than 6 is a FAILURE.
Each segment must cover at least 5% of the cohort. Overlaps are OK — they will be deduplicated at send time. Aim for 85-90%+ total coverage.
Prefer segments with 2-3 broad rules over segments with 4+ narrow rules.

{
  "segments": [
    {
      "name": "descriptive micro-segment name (e.g. 'High-Income Female Professionals Mumbai')",
      "description": "specific characteristics and why high engagement expected",
      "rules": [
        { "field": "exact_field_name_from_metadata", "operator": "between|not_between|in|not_in|equals|gt|gte|lt|lte", "values": ["..."] },
        { "field": "another_field", "operator": "equals", "values": ["value"] }
      ],
      "recommendedTone": "warm|professional|urgent|aspirational",
      "recommendedSendTime": "HH:MM",
      "priority": "high|medium|low",
      "expectedEngagement": "reason why this segment will open/click"
    }
  ],
  "abTestPlan": { "description": "A/B testing approach", "variables": ["subject_line", "send_time", "tone"] },
  "overallStrategy": "overview",
  "reasoning": "step-by-step reasoning"
}`;

    const strategy = await callLLM(systemPrompt, userPrompt, { jsonMode: true, temperature: 0.4 });

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
