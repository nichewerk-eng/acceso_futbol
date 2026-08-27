import { NextResponse } from 'next/server';
import { trackServer } from '@/lib/analytics/trackServer';
import { getLeaderboard, sanitizeUserId, scoreUser, submitPicks } from '@/lib/quiniela/service';

export const dynamic = 'force-dynamic';

interface Body {
  userId?: string;
  name?: string;
  picks?: Record<string, unknown>;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const userId = sanitizeUserId(body.userId);
  if (!userId) return NextResponse.json({ error: 'bad_user' }, { status: 400 });
  if (!body.picks || typeof body.picks !== 'object') {
    return NextResponse.json({ error: 'no_picks' }, { status: 400 });
  }

  const res = await submitPicks({ userId, name: body.name, picks: body.picks });
  if (!res.ok || !res.board) {
    const status = res.error === 'need_name' || res.error === 'need_card' ? 400 : 409;
    return NextResponse.json({ error: res.error ?? 'failed' }, { status });
  }

  const leaderboard = await getLeaderboard(res.board);
  const s = scoreUser(res.board, res.picks ?? {});
  void trackServer('Quiniela save', {
    jornada: res.board.jornadaNumber,
    picks: s.count,
  });
  return NextResponse.json(
    {
      ok: true,
      saved: res.saved,
      rejected: res.rejected,
      mine: { picks: res.picks ?? {}, points: s.points, played: s.played, count: s.count },
      ...(leaderboard ? { leaderboard } : {}),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
