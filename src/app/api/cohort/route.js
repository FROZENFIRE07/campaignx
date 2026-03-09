/**
 * Cohort API Route - Fetch and cache customer cohort
 */

import { NextResponse } from 'next/server';
import { getAPITools, findTool, executeAPICall } from '@/lib/agents/apiDiscovery';

export async function GET() {
    try {
        const apiKey = process.env.CAMPAIGNX_API_KEY;
        const { tools } = await getAPITools();
        const cohortTool = findTool(tools, 'get_customer_cohort_api_v1_get_customer_cohort_get');

        if (!cohortTool) {
            return NextResponse.json({ error: 'Cohort API not found in spec' }, { status: 500 });
        }

        const result = await executeAPICall(cohortTool, {}, null, apiKey);
        return NextResponse.json(result.data);
    } catch (error) {
        console.error('Cohort API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
