import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import AgentLog from '@/lib/models/AgentLog';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    const query = campaignId ? { campaignId } : {};
    const logs = await AgentLog.find(query).sort({ createdAt: -1 }).limit(100).lean();

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
