import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, generateId, generateApiKey, Agent } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, wallet, fid, platform } = body;

    if (!name || !wallet) {
      return NextResponse.json(
        { error: 'name and wallet are required' },
        { status: 400 }
      );
    }

    // Validate wallet address
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if wallet already registered
    const existing = db.agents.find(a => a.wallet.toLowerCase() === wallet.toLowerCase());
    if (existing) {
      return NextResponse.json(
        { error: 'Wallet already registered', agentId: existing.id },
        { status: 409 }
      );
    }

    const agent: Agent = {
      id: generateId(),
      name,
      wallet: wallet.toLowerCase(),
      fid,
      platform,
      apiKey: generateApiKey(),
      registeredAt: new Date().toISOString(),
      status: 'registered',
    };

    db.agents.push(agent);
    await saveDb(db);

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        wallet: agent.wallet,
        apiKey: agent.apiKey,
        status: agent.status,
      },
      message: '⚔️ Welcome to Streme Arena! Save your API key — it won\'t be shown again.',
      nextSteps: [
        '1. Wait for competition to start',
        '2. Launch a token on streme.fun',
        '3. Submit your token: POST /api/submissions',
        '4. Climb the leaderboard!',
      ],
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
