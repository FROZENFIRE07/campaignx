/**
 * Campaign Agent API Route - Main orchestration endpoint
 * POST: Start new campaign workflow
 */

import { NextResponse } from 'next/server';
import { orchestrateFullCampaign, executeCampaign, fetchReportWithPolling, analysisAndOptimization } from '@/lib/agents/orchestrator';
import { connectDB } from '@/lib/db';
import Campaign from '@/lib/models/Campaign';
import AgentLog from '@/lib/models/AgentLog';

function extractCampaignIdFromResult(result) {
    if (!result || typeof result !== 'object') return null;
    return result.campaign_id || result.campaignId || result.id || result.data?.campaign_id || result.data?.campaignId || null;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { action, brief, campaignId, approvedVariants } = body;

        await connectDB();

        if (action === 'start') {
            // Start the agentic campaign workflow
            const logs = [];
            const onLog = (entry) => logs.push(entry);

            const plan = await orchestrateFullCampaign(brief, onLog);

            // Save campaign to DB
            const campaign = new Campaign({
                brief,
                strategy: plan.strategy,
                contentVariants: plan.contentVariants,
                status: 'pending_approval',
            });
            await campaign.save();

            // Save agent logs
            for (const log of logs) {
                await AgentLog.create({ ...log, campaignId: campaign._id });
            }

            return NextResponse.json({
                success: true,
                campaignId: campaign._id,
                plan,
                logs,
            });
        }

        if (action === 'approve') {
            // Human approved — execute the campaign via API
            const campaign = await Campaign.findById(campaignId);
            if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

            const { results, campaignIds } = await executeCampaign(
                campaign,
                approvedVariants || campaign.contentVariants
            );

            // Backwards compatibility for string campaginId, and new array for campaignIds
            campaign.status = 'sent';
            
            // Just use the first one if length is 1 for backwards compatibility with single string
            if (campaignIds.length > 0) {
                campaign.campaignId = campaignIds[0]; 
                campaign.campaignIds = campaignIds; // Store the full list
            }
            
            await campaign.save();

            return NextResponse.json({ success: true, results, campaignId: campaign._id, externalCampaignIds: campaignIds });
        }

        if (action === 'report') {
            // Fetch latest performance report with polling and optional DB campaign lookup
            const { dbCampaignId } = body;
            let resolvedCampaignIds = campaignId ? [campaignId] : [];
            let dbCampaign = null;

            if (dbCampaignId) {
                dbCampaign = await Campaign.findById(dbCampaignId);
                if (!dbCampaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
                
                // Use array of IDs if available, else fallback to single external ID
                if (dbCampaign.campaignIds && dbCampaign.campaignIds.length > 0) {
                    resolvedCampaignIds = dbCampaign.campaignIds;
                } else if (dbCampaign.campaignId) {
                    resolvedCampaignIds = [dbCampaign.campaignId];
                }
            }

            if (resolvedCampaignIds.length === 0) {
                return NextResponse.json({ error: 'Missing campaignId. Send campaign first, then fetch report.' }, { status: 400 });
            }

            const reportPolling = await fetchReportWithPolling(resolvedCampaignIds);
            const report = reportPolling.report;

            if (dbCampaign && report) {
                dbCampaign.reportData = report.data || [];
                await dbCampaign.save();
            }

            return NextResponse.json({ success: true, report, reportPolling, campaignIds: resolvedCampaignIds });
        }

        if (action === 'analyze') {
            // Run analysis + optimization cycle
            const campaign = await Campaign.findById(body.dbCampaignId);
            if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

            let resolvedCampaignIds = campaignId ? [campaignId] : [];
            // Use array of IDs if available, else fallback to single external ID
            if (campaign.campaignIds && campaign.campaignIds.length > 0) {
                resolvedCampaignIds = campaign.campaignIds;
            } else if (campaign.campaignId) {
                resolvedCampaignIds = [campaign.campaignId];
            }

            if (resolvedCampaignIds.length === 0) {
                return NextResponse.json({ error: 'No external campaign ID found. Send campaign before analysis.' }, { status: 400 });
            }

            const logs = [];
            const onLog = (entry) => logs.push(entry);

            const result = await analysisAndOptimization(
                resolvedCampaignIds,
                campaign.brief,
                campaign.strategy,
                null, // Will re-fetch cohort inside
                onLog
            );

            // Update campaign with metrics
            campaign.metrics = result.analysis.overallPerformance;
            campaign.reportData = result.report.data;
            campaign.status = 'analyzed';
            campaign.optimizationHistory.push(result.optimization);
            await campaign.save();

            // Save logs
            for (const log of logs) {
                await AgentLog.create({ ...log, campaignId: campaign._id });
            }

            return NextResponse.json({ success: true, ...result, logs });
        }

        if (action === 'optimize') {
            // Execute optimization — send new optimized campaigns
            const campaign = await Campaign.findById(body.dbCampaignId);
            if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

            const optimizedVariants = body.optimizedVariants;
            const results = await executeCampaign(campaign, optimizedVariants);

            campaign.status = 'optimizing';
            campaign.iteration += 1;
            await campaign.save();

            return NextResponse.json({ success: true, results });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Agent API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        await connectDB();
        const campaigns = await Campaign.find().sort({ createdAt: -1 }).limit(20);
        return NextResponse.json({ campaigns });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
