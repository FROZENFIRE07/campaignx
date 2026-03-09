/**
 * Analysis Agent - Analyzes campaign performance metrics
 */

import { callLLM } from './llmService';

export async function analysisAgent(reportData, originalStrategy, cohortData) {
    const reportRows = reportData?.data || [];

    // Compute metrics
    const totalSent = reportRows.length;
    const totalOpened = reportRows.filter(r => r.EO === 'Y').length;
    const totalClicked = reportRows.filter(r => r.EC === 'Y').length;
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(2) : 0;
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(2) : 0;

    // Group by subject to see A/B test results
    const bySubject = {};
    reportRows.forEach(r => {
        const key = r.subject || 'unknown';
        if (!bySubject[key]) bySubject[key] = { total: 0, opened: 0, clicked: 0 };
        bySubject[key].total++;
        if (r.EO === 'Y') bySubject[key].opened++;
        if (r.EC === 'Y') bySubject[key].clicked++;
    });

    // Build per-customer ID mapping to cohort for segment analysis
    const cohortMap = {};
    (cohortData || []).forEach(c => { cohortMap[c.customer_id] = c; });

    // Segment performance analysis
    const segmentPerf = {};
    reportRows.forEach(r => {
        const customer = cohortMap[r.customer_id];
        if (!customer) return;

        // Use cohort fields for segmenting
        for (const [field, value] of Object.entries(customer)) {
            if (['customer_id', 'Email_ID', 'FirstName', 'LastName'].includes(field)) continue;
            const key = `${field}:${value}`;
            if (!segmentPerf[key]) segmentPerf[key] = { total: 0, opened: 0, clicked: 0, field, value };
            segmentPerf[key].total++;
            if (r.EO === 'Y') segmentPerf[key].opened++;
            if (r.EC === 'Y') segmentPerf[key].clicked++;
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

    const analysis = await callLLM(systemPrompt, userPrompt, { jsonMode: true, temperature: 0.3 });

    // Ensure computed metrics are included
    analysis.overallPerformance = {
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        totalSent,
        totalOpened,
        totalClicked,
    };

    return analysis;
}
