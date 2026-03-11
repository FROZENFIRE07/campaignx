/**
 * Orchestrator Agent — TRULY AGENTIC, SCHEMA-DRIVEN version
 * 
 * Architecture:
 * - The LLM reads API docs and DECIDES which API to call (no hardcoded operation IDs)
 * - Cohort data is stored locally; only schema METADATA goes to the LLM
 * - LLM outputs segmentation RULES executed locally (no raw data in prompts)
 * - Plan-Execute-Reflect loop with self-correction
 * - Fully adaptive to any cohort structure or schema changes
 */

import { callLLM } from './llmService';
import { getAPITools, buildToolDescriptions, getOperationalTools, clearAPIToolsCache } from './apiDiscovery';
import { agenticToolCall } from './toolCaller';
import { strategyAgent } from './strategyAgent';
import { contentAgent } from './contentAgent';
import { analysisAgent } from './analysisAgent';
import { optimizationAgent } from './optimizationAgent';
import { analyzeSchema, formatSchemaForLLM, detectIdField } from './schemaAnalyzer';
import { buildSegmentProfile } from './ruleEngine';

// Helper: wrap an async operation with a timeout
function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
        ),
    ]);
}

export async function orchestrateFullCampaign(brief, onLog) {
    // Clear cache to ensure fresh API discovery (cohort may have changed)
    clearAPIToolsCache();
    console.log('\n[ORCHESTRATOR] ════════════════════════════════════════');
    console.log('[ORCHESTRATOR] Starting campaign orchestration');
    console.log(`[ORCHESTRATOR] Brief: "${brief.substring(0, 100)}..."`);

    const { tools: allTools } = await getAPITools();
    console.log(`[ORCHESTRATOR] Discovered ${allTools.length} total API tools from OpenAPI spec`);
    // Only show campaign-relevant APIs (signup is one-time, already done)
    const tools = getOperationalTools(allTools);
    console.log(`[ORCHESTRATOR] Operational tools: ${tools.map(t => `${t.method} ${t.path}`).join(', ')}`);
    const toolDescs = buildToolDescriptions(tools);

    const log = (agent, step, data) => {
        const entry = { agent, step, ...data, timestamp: new Date().toISOString() };
        const r = typeof data.reasoning === 'string' ? data.reasoning : JSON.stringify(data.reasoning || '');
        console.log(`[${agent.toUpperCase()}] [${step}] ${r.substring(0, 200)}`);
        if (onLog) onLog(entry);
        return entry;
    };

    // ========================================
    // PHASE 1: LLM PLANS THE WORKFLOW
    // ========================================
    log('orchestrator', 'plan', {
        reasoning: 'Reading API documentation and planning the campaign workflow dynamically'
    });

    const workflowPlan = await withTimeout(
        callLLM(
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
        ),
        60000,
        'Workflow planning'
    );

    log('orchestrator', 'plan_complete', {
        reasoning: `Workflow planned: ${workflowPlan.overall_reasoning || 'Plan created'}`,
        output: workflowPlan
    });

    // ========================================
    // PHASE 2: AGENTIC COHORT FETCH
    // The LLM discovers and decides HOW to get the customer data
    // ========================================
    log('orchestrator', 'execute', {
        reasoning: 'Using agentic tool calling to fetch customer cohort — LLM reads API docs to discover the right endpoint'
    });

    const cohortResult = await withTimeout(
        agenticToolCall(
            'Fetch the complete customer cohort data. I need all customer IDs and their demographic details for campaign targeting.',
            { additionalInfo: `Campaign brief: ${brief}` }
        ),
        180000,
        'Cohort data fetch'
    );

    let cohortData = [];
    if (cohortResult.success) {
        // Robust data extraction: handle both { data: [...] } wrapper and direct array responses
        const resultPayload = cohortResult.result;
        cohortData = Array.isArray(resultPayload) ? resultPayload
            : (resultPayload?.data || resultPayload?.records || resultPayload?.customers || []);
        const source = cohortResult.adaptedSource || 'api';
        console.log(`[ORCHESTRATOR] Cohort source: ${source}, records: ${cohortData.length}`);
        if (cohortData[0]) {
            console.log(`[ORCHESTRATOR] Cohort fields: ${Object.keys(cohortData[0]).join(', ')}`);
            console.log(`[ORCHESTRATOR] Sample record: ${JSON.stringify(cohortData[0]).substring(0, 200)}`);
        }
        log('orchestrator', 'cohort_fetched', {
            reasoning: `[AGENTIC${source !== 'api' ? ' → ADAPTED to ' + source : ''}] ${cohortResult.reasoning}`,
            output: {
                totalCustomers: cohortData.length,
                apiUsed: cohortResult.apiCall,
                attempt: cohortResult.attempt,
                source,
                sampleFields: cohortData[0] ? Object.keys(cohortData[0]) : [],
            }
        });
    } else {
        console.error(`[ORCHESTRATOR] ✗ Cohort fetch FAILED: ${cohortResult.error}`);
        console.error(`[ORCHESTRATOR]   Attempts: ${cohortResult.attempts}`);
        log('orchestrator', 'cohort_error', {
            reasoning: `Failed to fetch cohort after ${cohortResult.attempts} attempts: ${cohortResult.error}. Proceeding with empty cohort.`
        });
    }

    // ========================================
    // PHASE 2.5: SCHEMA ANALYSIS — extract metadata, never pass raw data to LLM
    // ========================================
    const schema = analyzeSchema(cohortData);
    const schemaText = formatSchemaForLLM(schema);

    log('orchestrator', 'schema_analyzed', {
        reasoning: `[SCHEMA] Extracted metadata from ${schema.totalRecords} records, ${schema.fields.length} fields. ` +
            `Schema text: ${schemaText.length} chars (vs ${JSON.stringify(cohortData).length} chars raw — ` +
            `${Math.round((1 - schemaText.length / Math.max(1, JSON.stringify(cohortData).length)) * 100)}% token reduction)`,
        output: { fields: schema.fields, totalRecords: schema.totalRecords }
    });

    // ========================================
    // PHASE 3: ADAPTIVE STRATEGY — LLM sees ONLY schema metadata, outputs RULES
    // ========================================
    log('strategy', 'start', {
        reasoning: 'Sending only schema metadata to LLM (no raw data). LLM will output segmentation RULES executed locally.'
    });

    const strategy = await withTimeout(
        strategyAgent(brief, cohortData, toolDescs, schema),
        90000,
        'Strategy generation'
    );

    const reasoningText = typeof strategy.reasoning === 'string'
        ? strategy.reasoning.substring(0, 200)
        : JSON.stringify(strategy.reasoning || 'N/A').substring(0, 200);

    log('strategy', 'complete', {
        reasoning: `Strategy created with ${strategy.segments?.length || 0} segments. Reasoning: ${reasoningText}`,
        output: strategy
    });

    // ========================================
    // PHASE 4: CONTENT GENERATION — driven by strategy, uses segment profiles not raw data
    // ========================================
    log('content', 'start', {
        reasoning: 'Generating email content variations — content agent receives segment demographic profiles, not raw customer data'
    });

    // Build demographic profiles for each segment (no raw data leaves to LLM)
    const segmentProfiles = (strategy.segments || []).map(seg =>
        buildSegmentProfile(seg, cohortData, schema)
    );

    const contentVariants = await withTimeout(
        contentAgent(brief, strategy, segmentProfiles),
        120000,
        'Content generation'
    );

    log('content', 'complete', {
        reasoning: `Generated ${contentVariants.length} content variants across segments`,
        output: contentVariants.map(v => ({ segment: v.targetSegment, variant: v.variantName, recipients: v.customerIds?.length }))
    });

    // ========================================
    // PHASE 4.5: COHORT COVERAGE VALIDATION
    // Ensures every customer in the cohort is in at least one variant
    // ========================================
    const allCoveredIds = new Set();
    contentVariants.forEach(v => (v.customerIds || []).forEach(id => allCoveredIds.add(id)));

    // Use schema-detected ID field — no hardcoded field name
    const idField = detectIdField(schema);
    const allCohortIds = cohortData.map(c => c[idField]);
    const uncoveredIds = allCohortIds.filter(id => !allCoveredIds.has(id));

    if (uncoveredIds.length > 0) {
        log('orchestrator', 'coverage_fix', {
            reasoning: `[COVERAGE] ${uncoveredIds.length} customers were not in any segment. Adding them to ensure full cohort coverage for scoring.`
        });

        // Add uncovered customers to the last variant (or create a catch-all)
        if (contentVariants.length > 0) {
            const lastVariant = contentVariants[contentVariants.length - 1];
            contentVariants.push({
                ...lastVariant,
                targetSegment: 'Catch-All (Coverage)',
                variantName: 'Coverage',
                customerIds: uncoveredIds,
                reasoning: `Auto-generated to ensure 100% cohort coverage. ${uncoveredIds.length} customers added.`,
            });
        }
    }

    log('orchestrator', 'coverage_validated', {
        reasoning: `Cohort coverage: ${allCoveredIds.size + uncoveredIds.length}/${allCohortIds.length} customers covered (${uncoveredIds.length} added via catch-all)`
    });

    return {
        brief,
        cohortData,
        schema,
        strategy,
        contentVariants,
        totalCustomers: cohortData.length,
        workflowPlan,
        status: 'pending_approval',
    };
}

/**
 * AGENTIC campaign execution — LLM decides how to send via API
 * Customer IDs are passed directly in the API body (not through LLM prompt)
 * to avoid token overflow when segments are large.
 */
export async function executeCampaign(campaignPlan, approvedVariants) {
    const results = [];

    for (const variant of approvedVariants) {
        if (!variant.customerIds || variant.customerIds.length === 0) continue;

        // Use strategy-recommended send time if available, else fallback to now+5min
        const sendTime = buildSendTime(variant.sendTime);

        // Ensure body is always present
        const body = variant.body || variant.subject || 'Check out our latest offering from SuperBFSI!';
        const subject = variant.subject || 'SuperBFSI - New Offer';

        console.log(`[ORCHESTRATOR] Sending variant "${variant.variantName}" for segment "${variant.targetSegment}" (${variant.customerIds.length} recipients)`);

        // AGENTIC: LLM decides how to send — but we keep the prompt small
        // by only showing a sample of IDs. The full list is passed directly.
        const sendResult = await agenticToolCall(
            `Send a marketing email campaign with the following details:
- Subject: "${subject}"
- Body: "${body.substring(0, 500)}"
- Target customers: ${variant.customerIds.length} customer IDs (first 5: ${variant.customerIds.slice(0, 5).join(', ')}...)
- Send time: "${sendTime}" (format DD:MM:YY HH:MM:SS, IST timezone)

IMPORTANT: In the API request body, include ALL ${variant.customerIds.length} customer IDs.
The full list of customer IDs will be injected into your API call automatically.
In your api_call body, set list_customer_ids to the string "FULL_LIST_PLACEHOLDER" — it will be replaced with the actual IDs.
Make sure "body" and "subject" fields are included in the API call body.

Use the appropriate campaign sending API discovered from the documentation.`,
            {
                additionalInfo: `The body content is: "${body.substring(0, 300)}". Subject: "${subject}". Customer count: ${variant.customerIds.length}.`,
                _customerIds: variant.customerIds,
                _emailBody: body,
                _emailSubject: subject,
                _sendTime: sendTime,
            }
        );

        // If LLM decided the API call but used placeholder, inject real data
        if (sendResult.success) {
            results.push({
                ...sendResult.result,
                segment: variant.targetSegment,
                subject: subject,
                reasoning: sendResult.reasoning,
                apiUsed: sendResult.apiCall,
            });
        } else {
            // Fallback: if agentic send failed, try direct API call via dynamic discovery
            console.log(`[ORCHESTRATOR] Agentic send failed for "${variant.targetSegment}": ${sendResult.error}`);
            console.log(`[ORCHESTRATOR] Attempting direct send as recovery...`);
            try {
                const { getAPITools, executeAPICall, getOperationalTools } = await import('./apiDiscovery');
                const { tools: allTools } = await getAPITools();
                const tools = getOperationalTools(allTools);
                // Dynamic discovery: find POST tool by description/tag/name patterns, not hardcoded path
                const sendTool = tools.find(t => t.method === 'POST' && (
                    /send|campaign|dispatch|email|deliver/i.test(t.path) ||
                    /send|campaign|dispatch|email|deliver/i.test(t.name || '') ||
                    /send|campaign|dispatch|email|deliver/i.test(t.description || '')
                ));
                if (sendTool) {
                    const apiKey = process.env.CAMPAIGNX_API_KEY;
                    const directResult = await executeAPICall(sendTool, {}, {
                        subject: subject,
                        body: body,
                        list_customer_ids: variant.customerIds,
                        send_time: sendTime,
                    }, apiKey);
                    if (directResult.status < 400) {
                        console.log(`[ORCHESTRATOR] ✓ Direct send succeeded for "${variant.targetSegment}"`);
                        results.push({
                            ...directResult.data,
                            segment: variant.targetSegment,
                            subject: subject,
                            reasoning: 'Recovered via direct API call after agentic send failed',
                            apiUsed: { tool: sendTool.name, method: 'POST', path: sendTool.path },
                        });
                        continue;
                    }
                }
            } catch (recoveryErr) {
                console.error(`[ORCHESTRATOR] ✗ Recovery also failed: ${recoveryErr.message}`);
            }
            results.push({
                error: sendResult.error,
                segment: variant.targetSegment,
                subject: subject,
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
        { additionalInfo: `The campaign ID is: ${campaignId}. I need the full report data including all performance metric fields.` }
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
        reasoning: `Report fetched: ${report.total_rows ?? report.total_count ?? 'unknown'} rows`,
        output: { totalRows: report.total_rows ?? report.total_count }
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
            const payload = cohortResult.result;
            cohortData = Array.isArray(payload) ? payload
                : (payload?.data || payload?.records || payload?.customers || []);
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

/**
 * Build send time from strategy recommendation or fallback to future time.
 * Accepts "HH:MM" or "HH:MM IST" format from strategy, converts to DD:MM:YY HH:MM:SS.
 * If the recommended time is in the past today, schedule for tomorrow.
 */
function buildSendTime(recommendedTime) {
    const now = new Date();

    if (recommendedTime && /^\d{1,2}:\d{2}/.test(recommendedTime)) {
        // Parse HH:MM from strategy
        const [hStr, mStr] = recommendedTime.replace(/\s*IST\s*/i, '').split(':');
        const h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);

        if (!isNaN(h) && !isNaN(m)) {
            const target = new Date(now);
            target.setHours(h, m, 0, 0);

            // If the time is in the past today, schedule for tomorrow
            if (target <= now) {
                target.setDate(target.getDate() + 1);
            }

            return formatSendTime(target);
        }
    }

    // Fallback: 5 minutes from now
    now.setMinutes(now.getMinutes() + 5);
    return formatSendTime(now);
}
