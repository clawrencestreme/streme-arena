import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    
    // Return agents without API keys
    const agents = db.agents.map(a => ({
      id: a.id,
      name: a.name,
      wallet: a.wallet,
      fid: a.fid,
      platform: a.platform,
      registeredAt: a.registeredAt,
      status: a.status,
    }));

    return NextResponse.json({
      count: agents.length,
      agents,
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
