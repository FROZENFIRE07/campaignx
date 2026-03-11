import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Campaign from '@/lib/models/Campaign';
import AgentLog from '@/lib/models/AgentLog';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const campaign = await Campaign.findById(id).lean();
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const logs = await AgentLog.find({ campaignId: id }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({ campaign, logs });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
