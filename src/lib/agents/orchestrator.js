/**
 * Orchestrator Agent — TRULY AGENTIC version
 * 
 * Key difference from deterministic approach:
 * - The LLM reads API docs and DECIDES which API to call (no hardcoded operation IDs)
 * - Plan-Execute-Reflect loop with self-correction
 * - Adapts to any cohort structure automatically
 * - If the API changes, the LLM discovers the new endpoints
 */

import { callLLM } from './llmService';
import { getAPITools, buildToolDescriptions, getOperationalTools } from './apiDiscovery';
import { agenticToolCall } from './toolCaller';
import { strategyAgent } from './strategyAgent';
import { contentAgent } from './contentAgent';
import { analysisAgent } from './analysisAgent';
import { optimizationAgent } from './optimizationAgent';

export async function orchestrateFullCampaign(brief, onLog) {
    const { tools: allTools } = await getAPITools();
    // Only show campaign-relevant APIs (signup is one-time, already done)
    const tools = getOperationalTools(allTools);
    const toolDescs = buildToolDescriptions(tools);

    const log = (agent, step, data) => {
        const entry = { agent, step, ...data, timestamp: new Date().toISOString() };
        if (onLog) onLog(entry);
        return entry;
    };

    // ========================================
    // PHASE 1: LLM PLANS THE WORKFLOW
    // ========================================
    log('orchestrator', 'plan', {
        reasoning: 'Reading API documentation and planning the campaign workflow dynamically'
    });

    const workflowPlan = await callLLM(
        `You are a campaign orchestrator AI. Given a campaign brief and API documentation, plan the workflow steps.
    
AVAILABLE APIs (discovered from OpenAPI spec):
${toolDescs}

Respond in JSON with the workflow plan.`,
        `Campaign Brief: "${brief}"
    
Plan the steps needed to execute this campaign. What APIs do we need to call and in what order?
{
  "steps": [
    {"step": 1, "action": "description", "api_needed": "which API from the docs", "reasoning": "why"}
  ],
  "overall_reasoning": "high-level approach"
}`,
        { jsonMode: true, temperature: 0.3 }
    );

    log('orchestrator', 'plan_complete', {
        reasoning: `Workflow planned: ${workflowPlan.overall_reasoning || 'Plan created'}`,
        output: workflowPlan
    });

    // ========================================
    // PHASE 2: AGENTIC COHORT FETCH
    // The LLM decides HOW to get the customer data
    // ========================================
    log('orchestrator', 'execute', {
        reasoning: 'Using agentic tool calling to fetch customer cohort — LLM reads API docs to decide the endpoint'
    });

    const cohortResult = await agenticToolCall(
        'Fetch the complete customer cohort data. I need all customer IDs and their demographic details for campaign targeting.',
        { additionalInfo: `Campaign brief: ${brief}` }
    );

    let cohortData = [];
    if (cohortResult.success) {
        cohortData = cohortResult.result?.data || [];
        log('orchestrator', 'cohort_fetched', {
            reasoning: `[AGENTIC] ${cohortResult.reasoning}`,
            output: {
                totalCustomers: cohortData.length,
                apiUsed: cohortResult.apiCall,
                attempt: cohortResult.attempt,
                sampleFields: cohortData[0] ? Object.keys(cohortData[0]) : [],
            }
        });
    } else {
        log('orchestrator', 'cohort_error', {
            reasoning: `Failed to fetch cohort: ${cohortResult.error}. Proceeding with empty cohort.`
        });
    }

    // ========================================
    // PHASE 3: ADAPTIVE STRATEGY — reacts to actual cohort data
    // ========================================
    log('strategy', 'start', {
        reasoning: 'Analyzing actual cohort data (adapts to any cohort structure — no hardcoded field assumptions)'
    });

    const strategy = await strategyAgent(brief, cohortData, toolDescs);

    log('strategy', 'complete', {
        reasoning: `Strategy created with ${strategy.segments?.length || 0} segments. Reasoning: ${strategy.reasoning?.substring(0, 200) || 'N/A'}`,
        output: strategy
    });

    // ========================================
    // PHASE 4: CONTENT GENERATION — driven by strategy
    // ========================================
    log('content', 'start', {
        reasoning: 'Generating email content variations based on AI-determined strategy'
    });

    const contentVariants = await contentAgent(brief, strategy, cohortData);

    log('content', 'complete', {
        reasoning: `Generated ${contentVariants.length} content variants across segments`,
        output: contentVariants.map(v => ({ segment: v.targetSegment, variant: v.variantName, recipients: v.customerIds?.length }))
    });

    return {
        brief,
        cohortData,
        strategy,
        contentVariants,
        totalCustomers: cohortData.length,
        workflowPlan,
        status: 'pending_approval',
    };
}

/**
 * AGENTIC campaign execution — LLM decides how to send via API
 */
export async function executeCampaign(campaignPlan, approvedVariants) {
    const results = [];

    for (const variant of approvedVariants) {
        if (!variant.customerIds || variant.customerIds.length === 0) continue;

        // Format send_time as DD:MM:YY HH:MM:SS IST (5 min from now)
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        const sendTime = formatSendTime(now);

        // AGENTIC: LLM decides how to send the campaign
        const sendResult = await agenticToolCall(
            `Send a marketing email campaign with the following details:
- Subject: "${variant.subject}"
- Body: "${variant.body?.substring(0, 500)}"
- Target customers: ${variant.customerIds.length} customer IDs (first 5: ${variant.customerIds.slice(0, 5).join(', ')})
- All customer IDs: ${JSON.stringify(variant.customerIds)}
- Send time: "${sendTime}" (format DD:MM:YY HH:MM:SS, IST timezone)

Use the appropriate campaign sending API discovered from the documentation.`,
            {
                additionalInfo: `Full list of ${variant.customerIds.length} customer IDs is provided. The body supports text, emoji (UTF-8), and URLs. Subject supports English text only.`
            }
        );

        if (sendResult.success) {
            results.push({
                ...sendResult.result,
                segment: variant.targetSegment,
                subject: variant.subject,
                reasoning: sendResult.reasoning,
                apiUsed: sendResult.apiCall,
            });
        } else {
            results.push({
                error: sendResult.error,
                segment: variant.targetSegment,
                subject: variant.subject,
            });
        }
    }

    return results;
}

/**
 * AGENTIC report fetching — LLM discovers the reporting API
 */
export async function fetchReport(campaignId) {
    const reportResult = await agenticToolCall(
        `Fetch the performance report for campaign ID: "${campaignId}". I need to know the open rates and click rates for each customer.`,
        { additionalInfo: `The campaign ID is: ${campaignId}. I need the report data including EO (email opened) and EC (email clicked) flags.` }
    );

    if (reportResult.success) {
        return reportResult.result;
    }

    throw new Error(`Failed to fetch report: ${reportResult.error}`);
}

/**
 * Full analysis and optimization cycle with reflection
 */
export async function analysisAndOptimization(campaignId, brief, originalStrategy, cohortData, onLog) {
    const log = (agent, step, data) => {
        const entry = { agent, step, ...data, timestamp: new Date().toISOString() };
        if (onLog) onLog(entry);
        return entry;
    };

    // AGENTIC: Fetch report via dynamic tool calling
    log('analysis', 'start', {
        reasoning: '[AGENTIC] Using dynamic API discovery to fetch campaign performance report'
    });

    const report = await fetchReport(campaignId);

    log('analysis', 'report_fetched', {
        reasoning: `Report fetched: ${report.total_rows} rows`,
        output: { totalRows: report.total_rows }
    });

    // If cohort data not provided, re-fetch it (ADAPTIVE — handles cohort changes)
    if (!cohortData || cohortData.length === 0) {
        log('analysis', 'refetch_cohort', {
            reasoning: '[ADAPTIVE] Re-fetching customer cohort to handle potential cohort shifts'
        });
        const cohortResult = await agenticToolCall(
            'Fetch the current customer cohort data for analysis. The cohort may have changed since the campaign was sent.',
        );
        if (cohortResult.success) {
            cohortData = cohortResult.result?.data || [];
        }
    }

    // Analysis Agent — adapts to actual report structure
    const analysis = await analysisAgent(report, originalStrategy, cohortData);
    log('analysis', 'complete', {
        reasoning: `Performance: Open ${analysis.overallPerformance?.openRate}%, Click ${analysis.overallPerformance?.clickRate}%`,
        output: analysis
    });

    // REFLECT: Is the performance acceptable?
    const reflection = await callLLM(
        'You are a reflective AI agent. Evaluate campaign performance and decide if optimization is needed.',
        `Campaign performance:
- Open Rate: ${analysis.overallPerformance?.openRate}%
- Click Rate: ${analysis.overallPerformance?.clickRate}%
- Total Sent: ${analysis.overallPerformance?.totalSent}

Is this performance acceptable? Should we optimize? Respond in JSON:
{
  "needsOptimization": true/false,
  "reasoning": "why",
  "severity": "low/medium/high"
}`,
        { jsonMode: true, temperature: 0.3 }
    );

    log('orchestrator', 'reflect', {
        reasoning: `[REFLECT] ${reflection.reasoning}. Needs optimization: ${reflection.needsOptimization}`,
        output: reflection
    });

    // Optimization Agent
    log('optimization', 'start', {
        reasoning: 'Generating autonomous optimization based on performance analysis'
    });

    const optimization = await optimizationAgent(brief, analysis, originalStrategy, cohortData);

    log('optimization', 'complete', {
        reasoning: `Optimization plan: ${optimization.optimizationType}. Expected improvement: ${JSON.stringify(optimization.expectedImprovement)}`,
        output: optimization
    });

    return { report, analysis, optimization, reflection };
}

function formatSendTime(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${dd}:${mm}:${yy} ${hh}:${min}:${ss}`;
}
