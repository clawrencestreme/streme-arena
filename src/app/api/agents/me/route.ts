import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7);
    const db = await getDb();
    
    const agent = db.agents.find(a => a.apiKey === apiKey);
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Get agent's submissions
    const submissions = db.submissions.filter(s => s.agentId === agent.id);

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        wallet: agent.wallet,
        fid: agent.fid,
        platform: agent.platform,
        registeredAt: agent.registeredAt,
        status: agent.status,
      },
      submissions: submissions.map(s => ({
        id: s.id,
        tokenAddress: s.tokenAddress,
        tokenName: s.tokenName,
        tokenSymbol: s.tokenSymbol,
        submittedAt: s.submittedAt,
        verified: s.verified,
        competitionId: s.competitionId,
      })),
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
