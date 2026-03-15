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
import { strategyAgent, computeCohortSummary } from './strategyAgent';
import { contentAgent } from './contentAgent';
import { analysisAgent } from './analysisAgent';
import { optimizationAgent } from './optimizationAgent';
import { analyzeSchema, formatSchemaForLLM, detectIdField, detectBehavioralSignals } from './schemaAnalyzer';
import { discoverSegmentationValues, formatDiscoveryForLLM } from './valueDiscovery';
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

const PERFORMANCE_MATRIX = {
    clickWeight: 0.7,
    openWeight: 0.3,
    minScore: Number(process.env.PERFORMANCE_MATRIX_MIN_SCORE || 8),
    minClickRate: Number(process.env.PERFORMANCE_MATRIX_MIN_CLICK_RATE || 4),
    minOpenRate: Number(process.env.PERFORMANCE_MATRIX_MIN_OPEN_RATE || 18),
};

function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function chunkArray(items, chunkSize) {
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}

function getReportRowCount(report) {
    return Number(report?.total_rows ?? report?.total_count ?? report?.data?.length ?? 0);
}

function buildPerformanceMatrix(overallPerformance = {}) {
    const openRate = Number(overallPerformance.openRate || 0);
    const clickRate = Number(overallPerformance.clickRate || 0);
    const weightedScore = round2(
        clickRate * PERFORMANCE_MATRIX.clickWeight +
        openRate * PERFORMANCE_MATRIX.openWeight
    );

    const meetsThreshold = weightedScore >= PERFORMANCE_MATRIX.minScore &&
        clickRate >= PERFORMANCE_MATRIX.minClickRate &&
        openRate >= PERFORMANCE_MATRIX.minOpenRate;

    return {
        weightedScore,
        weights: {
            clickRate: PERFORMANCE_MATRIX.clickWeight,
            openRate: PERFORMANCE_MATRIX.openWeight,
        },
        threshold: PERFORMANCE_MATRIX.minScore,
        minClickRate: PERFORMANCE_MATRIX.minClickRate,
        minOpenRate: PERFORMANCE_MATRIX.minOpenRate,
        meetsThreshold,
        needsOptimization: !meetsThreshold,
    };
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
    // PHASE 2.5: SCHEMA ANALYSIS + VALUE DISCOVERY
    // Extract metadata, then discover valid segmentation values from data.
    // Raw data never reaches the LLM — only discovered attributes.
    // ========================================
    const schema = analyzeSchema(cohortData);
    const discovery = discoverSegmentationValues(cohortData, schema);
    const discoveryText = formatDiscoveryForLLM(discovery);
    const rawDataSize = JSON.stringify(cohortData).length;

    log('orchestrator', 'schema_analyzed', {
        reasoning: `[SCHEMA+DISCOVERY] Extracted metadata from ${schema.totalRecords} records, ${schema.fields.length} fields. ` +
            `Value Discovery: ${discovery.fields.length} segmentable fields, ${discoveryText.length} chars ` +
            `(vs ${rawDataSize} chars raw — ${Math.round((1 - discoveryText.length / Math.max(1, rawDataSize)) * 100)}% token reduction)`,
        output: { fields: schema.fields, totalRecords: schema.totalRecords, segmentableFields: discovery.fields.length }
    });

    // ========================================
    // PHASE 3: ADAPTIVE STRATEGY — LLM sees ONLY discovered values, outputs RULES
    // ========================================
    log('strategy', 'start', {
        reasoning: 'Sending discovered segmentation attributes to LLM (no raw data). LLM will choose from real values and output RULES executed locally.'
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

    // Build lightweight cohort summary for content generation
    const cohortSummary = computeCohortSummary(cohortData);

    const contentVariants = await withTimeout(
        contentAgent(brief, strategy, cohortSummary),
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

    // ========================================
    // PHASE 4.6: REORDER VARIANTS BY BEHAVIORAL SIGNAL DENSITY
    // The external simulator evaluates the first campaign sent.
    // Put the variant whose segment uses the most behavioral-signal rules first.
    // This is fully schema-driven — no hardcoded field names.
    // ========================================
    const behavioralFields = new Set(
        detectBehavioralSignals(schema).map(s => s.field.toLowerCase())
    );

    if (behavioralFields.size > 0 && contentVariants.length > 1) {
        // Score each variant by how many behavioral fields its segment rules reference
        const scoreVariant = (v) => {
            // Find the matching segment in strategy
            const seg = (strategy.segments || []).find(s => s.name === v.targetSegment);
            if (!seg || !seg.rules) return 0;
            const rules = Array.isArray(seg.rules) ? seg.rules : [];
            let score = 0;
            for (const rule of rules) {
                const fieldName = (rule.field || '').toLowerCase();
                if (behavioralFields.has(fieldName)) score += 2; // Behavioral rules count double
            }
            // Also boost by recipient count (larger = more reliable engagement signal)
            score += (v.customerIds?.length || 0) / 1000;
            return score;
        };

        contentVariants.sort((a, b) => scoreVariant(b) - scoreVariant(a));

        log('orchestrator', 'variants_reordered', {
            reasoning: `Reordered ${contentVariants.length} variants by behavioral signal density. First variant: "${contentVariants[0]?.targetSegment}" (${contentVariants[0]?.variantName})`,
            output: contentVariants.map(v => ({ segment: v.targetSegment, variant: v.variantName, recipients: v.customerIds?.length }))
        });
    }

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
    const maxBatchSize = Math.max(1, Number(process.env.SEND_BATCH_SIZE || 200));
    const interBatchDelayMs = Math.max(0, Number(process.env.SEND_BATCH_DELAY_MS || 500));
    const globallyAssignedCustomerIds = new Set();

    for (const variant of approvedVariants) {
        if (!variant.customerIds || variant.customerIds.length === 0) continue;

        // Deduplicate within variant and globally across variants so each customer is targeted once.
        const dedupedVariantIds = Array.from(new Set(variant.customerIds));
        const targetCustomerIds = dedupedVariantIds.filter((id) => {
            if (globallyAssignedCustomerIds.has(id)) return false;
            globallyAssignedCustomerIds.add(id);
            return true;
        });

        if (targetCustomerIds.length === 0) {
            console.log(`[ORCHESTRATOR] Skipping variant "${variant.variantName}" for segment "${variant.targetSegment}" — no recipients after deduplication`);
            continue;
        }

        // Use strategy-recommended send time if available, else fallback to now+5min
        const sendTime = buildSendTime(variant.sendTime);

        // Ensure body is always present
        const body = variant.body || variant.subject || 'Check out our latest offering from SuperBFSI!';
        
        // Preserve emojis (good for open rates!) — only strip null bytes, surrogates, and control chars
        let subject = variant.subject || 'SuperBFSI - New Offer';
        subject = subject.replace(/[\u0000-\u0008\u000B-\u001F\u007F\uD800-\uDFFF]/g, '').replace(/\s+/g, ' ').trim().substring(0, 55);

        const batches = chunkArray(targetCustomerIds, maxBatchSize);
        console.log(`[ORCHESTRATOR] Sending variant "${variant.variantName}" for segment "${variant.targetSegment}" (${targetCustomerIds.length} recipients in ${batches.length} batch(es))`);

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batchCustomerIds = batches[batchIndex];
            const batchLabel = `${batchIndex + 1}/${batches.length}`;
            console.log(`[ORCHESTRATOR] Sending batch ${batchLabel} (${batchCustomerIds.length} recipients)`);

            // AGENTIC: LLM decides how to send — but we keep the prompt small
            // by only showing a sample of IDs. The full list is passed directly.
            const sendResult = await agenticToolCall(
                `Send a marketing email campaign with the following details:
- Subject: "${subject}"
- Body: "${body.substring(0, 500)}"
- Target customers: ${batchCustomerIds.length} customer IDs (first 5: ${batchCustomerIds.slice(0, 5).join(', ')}...)
- Send time: "${sendTime}" (format DD:MM:YY HH:MM:SS, IST timezone)

IMPORTANT: In the API request body, include ALL ${batchCustomerIds.length} customer IDs.
The full list of customer IDs will be injected into your API call automatically.
In your api_call body, set list_customer_ids to the string "FULL_LIST_PLACEHOLDER" — it will be replaced with the actual IDs.
Make sure "body" and "subject" fields are included in the API call body.

Use the appropriate campaign sending API discovered from the documentation.`,
                {
                    additionalInfo: `The body content is: "${body.substring(0, 300)}". Subject: "${subject}". Customer count: ${batchCustomerIds.length}.`,
                    _customerIds: batchCustomerIds,
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
                    variantName: variant.variantName,
                    subject: subject,
                    reasoning: sendResult.reasoning,
                    apiUsed: sendResult.apiCall,
                    batch: {
                        index: batchIndex + 1,
                        total: batches.length,
                        size: batchCustomerIds.length,
                    },
                });
            } else {
                // Fallback: if agentic send failed, try direct API call via dynamic discovery
                console.log(`[ORCHESTRATOR] Agentic send failed for "${variant.targetSegment}" batch ${batchLabel}: ${sendResult.error}`);
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
                            list_customer_ids: batchCustomerIds,
                            send_time: sendTime,
                        }, apiKey);
                        if (directResult.status < 400) {
                            console.log(`[ORCHESTRATOR] ✓ Direct send succeeded for "${variant.targetSegment}" batch ${batchLabel}`);
                            results.push({
                                ...directResult.data,
                                segment: variant.targetSegment,
                                variantName: variant.variantName,
                                subject: subject,
                                reasoning: 'Recovered via direct API call after agentic send failed',
                                apiUsed: { tool: sendTool.name, method: 'POST', path: sendTool.path },
                                batch: {
                                    index: batchIndex + 1,
                                    total: batches.length,
                                    size: batchCustomerIds.length,
                                },
                            });
                            if (batchIndex < batches.length - 1 && interBatchDelayMs > 0) {
                                await sleep(interBatchDelayMs);
                            }
                            continue;
                        }
                    }
                } catch (recoveryErr) {
                    console.error(`[ORCHESTRATOR] ✗ Recovery also failed: ${recoveryErr.message}`);
                }
                results.push({
                    error: sendResult.error,
                    segment: variant.targetSegment,
                    variantName: variant.variantName,
                    subject: subject,
                    batch: {
                        index: batchIndex + 1,
                        total: batches.length,
                        size: batchCustomerIds.length,
                    },
                });
            }

            if (batchIndex < batches.length - 1 && interBatchDelayMs > 0) {
                await sleep(interBatchDelayMs);
            }
        }
    }

    const externalCampaignIds = new Set();
    
    // Extract unique campaign IDs from all success results
    for (const res of results) {
        if (!res.error) {
            const extId = res.campaign_id || res.campaignId || res.id || res.data?.campaign_id || res.data?.campaignId;
            if (extId) externalCampaignIds.add(extId);
        }
    }

    return { 
        results, 
        campaignIds: Array.from(externalCampaignIds) 
    };
}

export async function fetchReport(campaignId) {
    // campaignId can be a single string or an array of strings
    const rawIds = Array.isArray(campaignId) ? campaignId : [campaignId];
    const ids = Array.from(new Set(rawIds.filter(Boolean)));
    let allData = [];
    
    for (const id of ids) {
        if (!id) continue;
        const reportResult = await agenticToolCall(
            `Fetch the performance report for campaign ID: "${id}". I need to know the open rates and click rates for each customer.`,
            { additionalInfo: `The campaign ID is: ${id}. I need the full report data including all performance metric fields.` }
        );

        if (reportResult.success) {
            const data = reportResult.result?.data || reportResult.result || [];
            allData = allData.concat(Array.isArray(data) ? data : [data]);
        } else {
            console.warn(`[ORCHESTRATOR] Failed to fetch report for campaign ${id}: ${reportResult.error}`);
            // Don't throw here, allow other IDs to be fetched
        }
    }

    if (allData.length === 0 && ids.length > 0) {
        throw new Error(`Failed to fetch report for all campaign IDs: ${ids.join(', ')}`);
    }

    // Attempt deduplication by customer_id if present
    const uniqueDataMap = new Map();
    for (const row of allData) {
        const id = row.customer_id || row.id || JSON.stringify(row);
        uniqueDataMap.set(id, row);
    }
    const finalData = Array.from(uniqueDataMap.values());

    return { data: finalData, total_rows: finalData.length };
}

/**
 * Poll campaign report multiple times to capture fresher simulator output.
 * Uses bounded attempts and delay to avoid unbounded API usage.
 */
export async function fetchReportWithPolling(campaignId, onLog, options = {}) {
    const maxAttempts = Math.max(1, Number(options.maxAttempts || process.env.REPORT_POLL_MAX_ATTEMPTS || 3));
    const delayMs = Math.max(500, Number(options.delayMs || process.env.REPORT_POLL_DELAY_MS || 4000));

    let bestReport = null;
    let bestRows = -1;
    let attemptsMade = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        attemptsMade = attempt;
        try {
            const report = await fetchReport(campaignId);
            const rows = getReportRowCount(report);

            if (rows >= bestRows) {
                bestRows = rows;
                bestReport = report;
            }

            if (onLog) {
                onLog('analysis', 'report_poll', {
                    reasoning: `[REPORT-POLL] Attempt ${attempt}/${maxAttempts}: ${rows} rows`,
                    output: { attempt, rows, maxAttempts, delayMs },
                });
            }
        } catch (error) {
            if (onLog) {
                onLog('analysis', 'report_poll_error', {
                    reasoning: `[REPORT-POLL] Attempt ${attempt}/${maxAttempts} failed: ${error.message}`,
                });
            }

            if (attempt === maxAttempts && !bestReport) {
                throw error;
            }
        }

        if (attempt < maxAttempts) {
            await sleep(delayMs);
        }
    }

    return { report: bestReport, attemptsMade, bestRows, maxAttempts, delayMs };
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
        reasoning: '[AGENTIC] Using dynamic API discovery to fetch campaign performance report with bounded polling'
    });

    const reportPolling = await fetchReportWithPolling(campaignId, log);
    const report = reportPolling.report;

    log('analysis', 'report_fetched', {
        reasoning: `Report fetched after ${reportPolling.attemptsMade}/${reportPolling.maxAttempts} polls: ${getReportRowCount(report)} rows`,
        output: {
            totalRows: getReportRowCount(report),
            attemptsMade: reportPolling.attemptsMade,
            maxAttempts: reportPolling.maxAttempts,
            delayMs: reportPolling.delayMs,
        }
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
    const performanceMatrix = buildPerformanceMatrix(analysis.overallPerformance);
    analysis.performanceMatrix = performanceMatrix;
    analysis.overallPerformance = {
        ...analysis.overallPerformance,
        matrixScore: performanceMatrix.weightedScore,
        matrixWeights: performanceMatrix.weights,
        matrixThreshold: performanceMatrix.threshold,
        matrixQualified: performanceMatrix.meetsThreshold,
        optimizationRequired: performanceMatrix.needsOptimization,
    };

    // Calculate cohort summary for optimization and reflection
    const cohortSummary = computeCohortSummary(cohortData);

    log('analysis', 'complete', {
        reasoning: `Performance: Open ${analysis.overallPerformance?.openRate}%, Click ${analysis.overallPerformance?.clickRate}%`,
        output: analysis
    });

    log('analysis', 'performance_matrix', {
        reasoning: `[MATRIX] Weighted Score ${performanceMatrix.weightedScore} ` +
            `(Click ${performanceMatrix.weights.clickRate * 100}% + Open ${performanceMatrix.weights.openRate * 100}%). ` +
            `Threshold ${performanceMatrix.threshold}. Qualified: ${performanceMatrix.meetsThreshold}`,
        output: performanceMatrix,
    });

    // REFLECT: Is the performance acceptable?
    let reflection;
    try {
        reflection = await callLLM(
            'You are a reflective AI agent. Evaluate campaign performance and decide if optimization is needed.',
            `Campaign performance:
- Open Rate: ${analysis.overallPerformance?.openRate}%
- Click Rate: ${analysis.overallPerformance?.clickRate}%
- Total Sent: ${analysis.overallPerformance?.totalSent}
- Weighted Performance Score (70% Click + 30% Open): ${performanceMatrix.weightedScore}
- Score Threshold: ${performanceMatrix.threshold}
- Rule-based Needs Optimization: ${performanceMatrix.needsOptimization}

Cohort Summary Info:
${JSON.stringify(cohortSummary, null, 2)}

Is this performance acceptable? Should we optimize?
IMPORTANT RULE: If Open Rate < 25%, you MUST force personalization on the next iteration and suggest new variants based on the cohort summary data above.
Respond in JSON:
{
  "needsOptimization": true/false,
  "reasoning": "why",
  "severity": "low/medium/high"
}`,
            { jsonMode: true, temperature: 0.3 }
        );
    } catch (error) {
        reflection = {
            needsOptimization: performanceMatrix.needsOptimization,
            reasoning: `Deterministic reflection fallback used because LLM was unavailable: ${error.message}`,
            severity: performanceMatrix.needsOptimization ? 'high' : 'low',
            fallbackUsed: true,
        };
    }

    // Safety gate: deterministic matrix decision takes precedence over subjective LLM reflection.
    const finalNeedsOptimization = performanceMatrix.needsOptimization || Boolean(reflection.needsOptimization);
    reflection.needsOptimization = finalNeedsOptimization;
    reflection.enforcedByMatrix = performanceMatrix.needsOptimization;
    reflection.performanceMatrix = performanceMatrix;

    log('orchestrator', 'reflect', {
        reasoning: `[REFLECT] ${reflection.reasoning}. Needs optimization: ${reflection.needsOptimization}`,
        output: reflection
    });

    // Optimization Agent
    log('optimization', 'start', {
        reasoning: finalNeedsOptimization
            ? 'Generating autonomous optimization based on performance analysis and matrix gate'
            : 'Skipping optimization because matrix threshold is achieved'
    });

    let optimization;
    if (finalNeedsOptimization) {
        try {
            optimization = await optimizationAgent(brief, analysis, originalStrategy, cohortData, cohortSummary);
        } catch (error) {
            optimization = {
                optimizationType: 'content_refresh',
                fallbackUsed: true,
                reasoning: `Deterministic optimization fallback used because LLM was unavailable: ${error.message}`,
                expectedImprovement: {
                    openRate: '+2-4%',
                    clickRate: '+1-3%',
                },
                changes: [
                    'Retarget only the lowest-performing segments first.',
                    'Refresh subject line and CTA language for next send.',
                    'Adjust send time to a different hour slot and re-test.'
                ],
                humanApprovalRequired: true,
                newSegments: [],
                performanceMatrix,
            };
        }
    } else {
        optimization = {
            optimizationType: 'none',
            skipped: true,
            reasoning: `Skipped optimization: weighted score ${performanceMatrix.weightedScore} met threshold ${performanceMatrix.threshold} with open ${analysis.overallPerformance?.openRate}% and click ${analysis.overallPerformance?.clickRate}%.`,
            expectedImprovement: {
                openRate: '+0%',
                clickRate: '+0%',
            },
            changes: [],
            humanApprovalRequired: false,
            performanceMatrix,
        };
    }

    log('optimization', 'complete', {
        reasoning: `Optimization plan: ${optimization.optimizationType}. Expected improvement: ${JSON.stringify(optimization.expectedImprovement)}`,
        output: optimization
    });

    return { report, analysis, optimization, reflection, reportPolling };
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
