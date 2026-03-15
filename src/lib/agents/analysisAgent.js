/**
 * Analysis Agent — Analyzes campaign performance metrics.
 * Schema-adaptive: uses schema metadata to detect ID fields and skip identity columns.
 * Report-adaptive: dynamically detects open/click metric fields from actual data.
 */

import { callLLM } from './llmService';
import { analyzeSchema, detectIdField, isIdentityField } from './schemaAnalyzer';

/**
 * Pure-JS compact report summary builder — zero LLM cost.
 * Returns a ~100-token JSON perfect for feeding optimization loops.
 */
export function buildReportSummary(reportData, analysis = {}) {
    const rows = reportData?.data || [];
    const { openField, clickField } = detectReportMetricFieldsInternal(rows);
    
    const totalSent = rows.length;
    const totalOpened = rows.filter(r => isMetricTrueInternal(r, openField)).length;
    const totalClicked = rows.filter(r => isMetricTrueInternal(r, clickField)).length;
    const openRate = totalSent > 0 ? Number(((totalOpened / totalSent) * 100).toFixed(2)) : 0;
    const clickRate = totalSent > 0 ? Number(((totalClicked / totalSent) * 100).toFixed(2)) : 0;

    // Find best and worst subjects
    const bySubject = {};
    rows.forEach(r => {
        const key = r.subject || 'unknown';
        if (!bySubject[key]) bySubject[key] = { total: 0, opened: 0, clicked: 0 };
        bySubject[key].total++;
        if (isMetricTrueInternal(r, openField)) bySubject[key].opened++;
        if (isMetricTrueInternal(r, clickField)) bySubject[key].clicked++;
    });

    const ranked = Object.entries(bySubject)
        .map(([subject, s]) => ({ subject, openRate: s.total > 0 ? (s.opened/s.total)*100 : 0, clickRate: s.total > 0 ? (s.clicked/s.total)*100 : 0, total: s.total }))
        .sort((a, b) => b.clickRate - a.clickRate || b.openRate - a.openRate);

    const winner = ranked[0];
    const loser = ranked[ranked.length - 1];

    // Generate one-line diagnostic
    let insight = '';
    if (openRate < 18) insight = 'Very low open rate — subjects too generic or send time wrong. Force 1.25% benefit + local city angle.';
    else if (openRate < 27) insight = 'Below BFSI benchmark (27%) — tighten micro-segmentation and add urgency to subjects.';
    else if (clickRate < 4) insight = 'Opens OK but clicks low — body CTA too weak. Bold the 1.25% more prominently and shorten body.';
    else insight = `Good performance. Open ${openRate}%, Click ${clickRate}%. Repeat winning patterns.`;

    return {
        openRate,
        clickRate,
        totalSent,
        winnerSubject: winner?.subject?.substring(0, 50) || 'N/A',
        winnerOpenRate: Number((winner?.openRate || 0).toFixed(1)),
        winnerClickRate: Number((winner?.clickRate || 0).toFixed(1)),
        loserSubject: loser?.subject?.substring(0, 50) || 'N/A',
        insight,
    };
}

function detectReportMetricFieldsInternal(reportRows) {
    return detectReportMetricFields(reportRows);
}
function isMetricTrueInternal(row, field) {
    return isMetricTrue(row, field);
}

/**
 * Dynamically detect which report fields represent "email opened" and "email clicked".
 * Inspects field names and values — no hardcoded assumptions about EO/EC.
 * Fallback chain: name pattern → Y/N boolean fields → OpenAPI spec hints.
 */
function detectReportMetricFields(reportRows) {
    if (!reportRows || reportRows.length === 0) return { openField: null, clickField: null };

    const fields = Object.keys(reportRows[0]);

    // Patterns for open/click fields (case-insensitive)
    const openPatterns = [/^EO$/i, /email.?open/i, /^opened?$/i, /^is.?open/i, /^open.?flag/i, /^mail.?open/i];
    const clickPatterns = [/^EC$/i, /email.?click/i, /^clicked?$/i, /^is.?click/i, /^click.?flag/i, /^mail.?click/i];

    let openField = fields.find(f => openPatterns.some(p => p.test(f)));
    let clickField = fields.find(f => clickPatterns.some(p => p.test(f)));

    // If name patterns didn't match, look for Y/N boolean fields that aren't known non-metric fields
    if (!openField || !clickField) {
        const knownNonMetric = new Set(['subject', 'body', 'campaign_id', 'customer_id', 'send_time',
            'invokation_date', 'invokation_time', 'email', 'name']);
        const booleanFields = fields.filter(f => {
            if (knownNonMetric.has(f.toLowerCase())) return false;
            // Check if most values are Y/N or true/false or 1/0
            const sample = reportRows.slice(0, 50);
            const values = new Set(sample.map(r => String(r[f]).toUpperCase()));
            return (values.size <= 3 && (values.has('Y') || values.has('TRUE') || values.has('1')));
        });

        // If exactly 2 boolean fields found, assign by order (open usually comes before click)
        if (booleanFields.length >= 2) {
            if (!openField) openField = booleanFields[0];
            if (!clickField) clickField = booleanFields[1];
        } else if (booleanFields.length === 1) {
            if (!openField) openField = booleanFields[0];
        }
    }

    console.log(`[ANALYSIS] Detected report metric fields — open: "${openField}", click: "${clickField}"`);
    return { openField, clickField };
}

/**
 * Check if a report row's metric field indicates "true" (Y, true, 1, yes).
 */
function isMetricTrue(row, field) {
    if (!field || row[field] === undefined) return false;
    const val = String(row[field]).toUpperCase();
    return val === 'Y' || val === 'YES' || val === 'TRUE' || val === '1';
}

/**
 * Detect report ID field by inspecting actual report data.
 * Uses schema-based detection on the report data itself, then falls back to
 * matching the cohort's ID field name, then broad pattern matching.
 */
function detectReportIdField(reportRows, cohortIdField) {
    if (!reportRows || reportRows.length === 0) return cohortIdField || 'customer_id';

    const fields = Object.keys(reportRows[0]);

    // 1. Direct match with cohort ID field
    const directMatch = fields.find(f => f === cohortIdField);
    if (directMatch) return directMatch;

    // 2. Run schema-based ID detection on the report data itself
    const reportSchema = analyzeSchema(reportRows);
    const reportIdField = detectIdField(reportSchema);
    if (reportIdField && fields.includes(reportIdField)) return reportIdField;

    // 3. Broad pattern matching
    const idMatch = fields.find(f => /customer_?id|cust_?id|user_?id|client_?id/i.test(f))
        || fields.find(f => /^id$|_id$/i.test(f));
    if (idMatch) return idMatch;

    // 4. Last resort: look for field with values matching cohort ID patterns (e.g., CUST0001)
    const sampleVal = String(reportRows[0][fields[0]] || '');
    if (/^[A-Z]{2,}[\-_]?\d+$/i.test(sampleVal)) return fields[0];

    return cohortIdField || fields[0];
}

function buildDeterministicAnalysis(totalSent, totalOpened, totalClicked, bySubject, segmentStats) {
    const rankedSubjects = Object.entries(bySubject)
        .map(([subject, stat]) => {
            const openRate = stat.total > 0 ? (stat.opened / stat.total) * 100 : 0;
            const clickRate = stat.total > 0 ? (stat.clicked / stat.total) * 100 : 0;
            return { subject, ...stat, openRate, clickRate };
        })
        .sort((a, b) => (b.clickRate - a.clickRate) || (b.openRate - a.openRate));

    const winner = rankedSubjects[0];
    const topSegments = segmentStats.slice(0, 5).map((s) => `${s.field}:${s.value} (click ${s.clickRate}%, open ${s.openRate}%, n=${s.total})`);
    const bottomSegments = segmentStats.slice(-5).map((s) => `${s.field}:${s.value} (click ${s.clickRate}%, open ${s.openRate}%, n=${s.total})`);

    return {
        overallPerformance: {
            openRate: totalSent > 0 ? Number(((totalOpened / totalSent) * 100).toFixed(2)) : 0,
            clickRate: totalSent > 0 ? Number(((totalClicked / totalSent) * 100).toFixed(2)) : 0,
            totalSent,
            totalOpened,
            totalClicked,
        },
        abTestWinner: winner
            ? `Top subject by click/open: "${winner.subject}" (click ${winner.clickRate.toFixed(2)}%, open ${winner.openRate.toFixed(2)}%, n=${winner.total}).`
            : 'Not enough A/B subject data to determine a winner.',
        topSegments,
        bottomSegments,
        insights: [
            'Fallback analysis mode used because LLM was unavailable (network/DNS issue).',
            'Prioritize subject lines with higher click rate first, then open rate.',
            'Focus optimization on bottom-performing demographic slices with enough sample size.'
        ],
        recommendedActions: [
            'Reuse winning subject pattern for the next iteration.',
            'Retarget bottom segments with adjusted send time and stronger CTA.',
            'Run a smaller A/B retest before full relaunch.'
        ],
        reasoning: 'Deterministic analysis computed from report aggregates and segment statistics due to LLM outage.',
        fallbackUsed: true,
    };
}

export async function analysisAgent(reportData, originalStrategy, cohortData) {
    const reportRows = reportData?.data || [];

    // Dynamically detect metric fields — no hardcoded EO/EC
    const { openField, clickField } = detectReportMetricFields(reportRows);

    // Compute metrics
    const totalSent = reportRows.length;
    const totalOpened = reportRows.filter(r => isMetricTrue(r, openField)).length;
    const totalClicked = reportRows.filter(r => isMetricTrue(r, clickField)).length;
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(2) : 0;
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(2) : 0;

    // Group by subject to see A/B test results
    const bySubject = {};
    reportRows.forEach(r => {
        const key = r.subject || 'unknown';
        if (!bySubject[key]) bySubject[key] = { total: 0, opened: 0, clicked: 0 };
        bySubject[key].total++;
        if (isMetricTrue(r, openField)) bySubject[key].opened++;
        if (isMetricTrue(r, clickField)) bySubject[key].clicked++;
    });

    // Build schema from cohort to dynamically detect ID field and identity columns
    const schema = analyzeSchema(cohortData || []);
    const idField = detectIdField(schema);

    // Build per-customer ID mapping to cohort for segment analysis
    const cohortMap = {};
    (cohortData || []).forEach(c => { cohortMap[c[idField]] = c; });

    // Detect which report field maps to customer ID — uses schema detection, no hardcoded fallback
    const reportIdField = detectReportIdField(reportRows, idField);
    console.log(`[ANALYSIS] Report ID field: "${reportIdField}", Cohort ID field: "${idField}"`);

    // Segment performance analysis — skip identity fields using schema
    const segmentPerf = {};
    reportRows.forEach(r => {
        const customer = cohortMap[r[reportIdField]];
        if (!customer) return;

        for (const [field, value] of Object.entries(customer)) {
            // Skip identity/contact fields based on schema detection
            const fieldDetail = schema.fieldDetails[field];
            if (!fieldDetail || isIdentityField(fieldDetail)) continue;

            const key = `${field}:${value}`;
            if (!segmentPerf[key]) segmentPerf[key] = { total: 0, opened: 0, clicked: 0, field, value };
            segmentPerf[key].total++;
            if (isMetricTrue(r, openField)) segmentPerf[key].opened++;
            if (isMetricTrue(r, clickField)) segmentPerf[key].clicked++;
        }
    });

    // Find top and bottom segments
    const segmentStats = Object.values(segmentPerf)
        .filter(s => s.total >= 5)
        .map(s => ({
            ...s,
            openRate: ((s.opened / s.total) * 100).toFixed(2),
            clickRate: ((s.clicked / s.total) * 100).toFixed(2),
        }))
        .sort((a, b) => parseFloat(b.clickRate) - parseFloat(a.clickRate));

    const systemPrompt = `You are a data-driven marketing analyst AI. Analyze campaign performance and provide actionable insights.

Respond in valid JSON format.`;

    const userPrompt = `Campaign Performance Report:

Overall Metrics:
- Total Sent: ${totalSent}
- Open Rate: ${openRate}%
- Click Rate: ${clickRate}%

A/B Test Results (by subject):
${JSON.stringify(bySubject, null, 2)}

Top Performing Segments:
${JSON.stringify(segmentStats.slice(0, 10), null, 2)}

Bottom Performing Segments:
${JSON.stringify(segmentStats.slice(-10), null, 2)}

Provide analysis in JSON:
{
  "overallPerformance": { "openRate": ${openRate}, "clickRate": ${clickRate}, "totalSent": ${totalSent}, "totalOpened": ${totalOpened}, "totalClicked": ${totalClicked} },
  "abTestWinner": "which subject performed better and why",
  "topSegments": ["list of high-performing demographic segments"],
  "bottomSegments": ["list of underperforming demographic segments"],
  "insights": ["actionable insight 1", "..."],
  "recommendedActions": ["specific action 1", "..."],
  "reasoning": "step-by-step analysis reasoning"
}`;

    let analysis;
    try {
        analysis = await callLLM(systemPrompt, userPrompt, { jsonMode: true, temperature: 0.3 });
    } catch (error) {
        console.error(`[ANALYSIS] LLM unavailable, switching to deterministic fallback: ${error.message}`);
        analysis = buildDeterministicAnalysis(totalSent, totalOpened, totalClicked, bySubject, segmentStats);
    }

    // Ensure computed metrics are included
    analysis.overallPerformance = {
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        totalSent,
        totalOpened,
        totalClicked,
    };

    // Build compact report summary for optimization loops (pure JS, no LLM cost)
    analysis.reportSummary = buildReportSummary(reportData, analysis);
    console.log(`[ANALYSIS] reportSummary: ${JSON.stringify(analysis.reportSummary)}`);

    return analysis;
}
