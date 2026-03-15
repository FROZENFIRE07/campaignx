/**
 * Campaign Agent API Route - Main orchestration endpoint
 * POST: Start new campaign workflow
 */

import { NextResponse } from 'next/server';
import { orchestrateFullCampaign, executeCampaign, fetchReport, analysisAndOptimization } from '@/lib/agents/orchestrator';
import { connectDB } from '@/lib/db';
import Campaign from '@/lib/models/Campaign';
import AgentLog from '@/lib/models/AgentLog';

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

            const results = await executeCampaign(
                campaign,
                approvedVariants || campaign.contentVariants
            );

            campaign.status = 'sent';
            campaign.campaignId = results[0]?.campaign_id;
            await campaign.save();

            return NextResponse.json({ success: true, results, campaignId: campaign._id });
        }

        if (action === 'report') {
            // Fetch performance report
            const report = await fetchReport(campaignId);
            return NextResponse.json({ success: true, report });
        }

        if (action === 'analyze') {
            // Run analysis + optimization cycle
            const campaign = await Campaign.findById(body.dbCampaignId);
            if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

            const logs = [];
            const onLog = (entry) => logs.push(entry);

            const result = await analysisAndOptimization(
                campaignId,
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
