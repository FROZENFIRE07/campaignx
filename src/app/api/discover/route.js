/**
 * API Discovery route - Exposes the discovered tools for frontend display
 */

import { NextResponse } from 'next/server';
import { getAPITools, buildToolDescriptions } from '@/lib/agents/apiDiscovery';

export async function GET() {
    try {
        const { tools, spec } = await getAPITools();
        const descriptions = buildToolDescriptions(tools);
        return NextResponse.json({
            tools: tools.map(t => ({
                name: t.name,
                method: t.method,
                path: t.path,
                description: t.description.substring(0, 200),
            })),
            descriptions,
            specVersion: spec?.info?.version,
            specTitle: spec?.info?.title,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
