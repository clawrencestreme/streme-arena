import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const db = await getDb();
    
    let competitions = db.competitions;
    if (status) {
      competitions = competitions.filter(c => c.status === status);
    }

    // Add participant counts
    const result = competitions.map(c => {
      const submissions = db.submissions.filter(s => s.competitionId === c.id);
      const participants = new Set(submissions.map(s => s.agentId)).size;
      return {
        ...c,
        participantCount: participants,
        submissionCount: submissions.length,
      };
    });

    return NextResponse.json({
      count: result.length,
      competitions: result,
    });
  } catch (error) {
    console.error('Error fetching competitions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
