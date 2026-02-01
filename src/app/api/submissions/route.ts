import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, generateId, Submission } from '@/lib/db';
import { verifyStremeToken } from '@/lib/streme';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');

    const db = await getDb();
    
    let submissions = db.submissions;
    if (competitionId) {
      submissions = submissions.filter(s => s.competitionId === competitionId);
    }

    // Join with agent names
    const result = submissions.map(s => {
      const agent = db.agents.find(a => a.id === s.agentId);
      return {
        ...s,
        agentName: agent?.name || 'Unknown',
        agentWallet: agent?.wallet,
      };
    });

    return NextResponse.json({
      count: result.length,
      submissions: result,
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { tokenAddress, tokenName, tokenSymbol, launchTx, competitionId } = body;

    if (!tokenAddress) {
      return NextResponse.json(
        { error: 'tokenAddress is required' },
        { status: 400 }
      );
    }

    // Validate token address
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return NextResponse.json(
        { error: 'Invalid token address' },
        { status: 400 }
      );
    }

    // VERIFY TOKEN WAS DEPLOYED VIA STREME
    const stremeToken = await verifyStremeToken(tokenAddress);
    if (!stremeToken) {
      return NextResponse.json(
        { 
          error: 'Token not found on Streme. Only tokens launched via streme.fun are eligible.',
          hint: 'Make sure your token was deployed using Streme\'s launcher at streme.fun'
        },
        { status: 400 }
      );
    }

    // Get current active competition or use provided one
    const competition = competitionId 
      ? db.competitions.find(c => c.id === competitionId)
      : db.competitions.find(c => c.status === 'active' || c.status === 'upcoming');

    if (!competition) {
      return NextResponse.json(
        { error: 'No active competition found' },
        { status: 400 }
      );
    }

    // Check competition timing
    const now = new Date();
    const startsAt = new Date(competition.startsAt);
    const endsAt = new Date(competition.endsAt);

    if (now > endsAt) {
      return NextResponse.json(
        { error: 'Competition has ended' },
        { status: 400 }
      );
    }

    // Check if agent already submitted to this competition
    const existingSubmission = db.submissions.find(
      s => s.agentId === agent.id && s.competitionId === competition.id
    );
    if (existingSubmission) {
      return NextResponse.json(
        { error: 'Already submitted to this competition', submissionId: existingSubmission.id },
        { status: 409 }
      );
    }

    // Check if token already submitted
    const tokenExists = db.submissions.find(
      s => s.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() && s.competitionId === competition.id
    );
    if (tokenExists) {
      return NextResponse.json(
        { error: 'Token already submitted by another agent' },
        { status: 409 }
      );
    }

    const submission: Submission = {
      id: generateId(),
      agentId: agent.id,
      tokenAddress: tokenAddress.toLowerCase(),
      tokenName: tokenName || stremeToken.name,
      tokenSymbol: tokenSymbol || stremeToken.symbol,
      launchTx: launchTx || '',
      submittedAt: new Date().toISOString(),
      verified: true, // Verified via Streme API
      competitionId: competition.id,
    };

    db.submissions.push(submission);
    
    // Mark agent as active
    const agentIndex = db.agents.findIndex(a => a.id === agent.id);
    if (agentIndex >= 0) {
      db.agents[agentIndex].status = 'active';
    }
    
    await saveDb(db);

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        tokenAddress: submission.tokenAddress,
        tokenName: submission.tokenName,
        tokenSymbol: submission.tokenSymbol,
        competitionId: submission.competitionId,
        submittedAt: submission.submittedAt,
        verified: submission.verified,
      },
      stremeData: {
        deployer: stremeToken.deployer,
        image: stremeToken.image,
      },
      message: '🚀 Token verified and submitted! You\'re in the competition.',
      competition: {
        name: competition.name,
        endsAt: competition.endsAt,
        prizes: competition.prizePool,
      },
    });
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
