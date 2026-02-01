import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { fetchTokenMetrics } from '@/lib/metrics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');
    const sortBy = searchParams.get('sortBy') || 'volume24h';
    const refresh = searchParams.get('refresh') === 'true';

    const db = await getDb();

    // Get competition
    const competition = competitionId
      ? db.competitions.find(c => c.id === competitionId)
      : db.competitions.find(c => c.status === 'active') || db.competitions[0];

    if (!competition) {
      return NextResponse.json(
        { error: 'No competition found' },
        { status: 404 }
      );
    }

    // Get submissions for this competition
    const submissions = db.submissions.filter(s => s.competitionId === competition.id);

    // Build leaderboard with metrics
    const leaderboard = await Promise.all(
      submissions.map(async (s) => {
        const agent = db.agents.find(a => a.id === s.agentId);
        
        // Check if we have cached metrics
        let metrics = db.metrics.find(m => m.tokenAddress === s.tokenAddress);
        const metricsAge = metrics 
          ? Date.now() - new Date(metrics.lastUpdated).getTime()
          : Infinity;

        // Refresh if older than 5 minutes or explicitly requested
        if (refresh || metricsAge > 5 * 60 * 1000) {
          const freshMetrics = await fetchTokenMetrics(s.tokenAddress);
          if (freshMetrics) {
            const newMetrics = {
              tokenAddress: s.tokenAddress,
              volume24h: freshMetrics.volume24h,
              holders: freshMetrics.holders,
              marketCap: freshMetrics.marketCap,
              lastUpdated: new Date().toISOString(),
            };

            // Update or add metrics
            const existingIndex = db.metrics.findIndex(m => m.tokenAddress === s.tokenAddress);
            if (existingIndex >= 0) {
              db.metrics[existingIndex] = newMetrics;
            } else {
              db.metrics.push(newMetrics);
            }
            metrics = newMetrics;
          }
        }

        return {
          rank: 0, // Will be set after sorting
          agentId: agent?.id,
          agentName: agent?.name || 'Unknown',
          agentWallet: agent?.wallet,
          tokenAddress: s.tokenAddress,
          tokenName: s.tokenName,
          tokenSymbol: s.tokenSymbol,
          submittedAt: s.submittedAt,
          verified: s.verified,
          metrics: metrics ? {
            volume24h: metrics.volume24h,
            holders: metrics.holders,
            marketCap: metrics.marketCap,
            lastUpdated: metrics.lastUpdated,
          } : null,
        };
      })
    );

    // Save updated metrics
    await saveDb(db);

    // Sort by selected metric
    const sortKey = sortBy as 'volume24h' | 'holders' | 'marketCap';
    leaderboard.sort((a, b) => {
      const aVal = a.metrics?.[sortKey] || 0;
      const bVal = b.metrics?.[sortKey] || 0;
      return bVal - aVal;
    });

    // Assign ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return NextResponse.json({
      competition: {
        id: competition.id,
        name: competition.name,
        status: competition.status,
        startsAt: competition.startsAt,
        endsAt: competition.endsAt,
        prizePool: competition.prizePool,
      },
      sortedBy: sortBy,
      participantCount: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
