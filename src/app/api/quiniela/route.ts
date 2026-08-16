import { NextResponse } from 'next/server';
import {
  getLeaderboard,
  getQuinielaBoard,
  sanitizeUserId,
  scoreUser,
} from '@/lib/quiniela/service';
import { getPicks } from '@/lib/quiniela/store';

export const dynamic = 'force-dynamic';

/** Board + leaderboard (+ the caller's saved card when `?u=` is a valid id). */
export async function GET(req: Request) {
  const board = await getQuinielaBoard();
  if (!board) return NextResponse.json({ error: 'no_jornada' }, { status: 404 });

  const leaderboard = await getLeaderboard(board);

  const userId = sanitizeUserId(new URL(req.url).searchParams.get('u'));
  let mine: { picks: Record<string, string>; points: number; played: number; count: number } | null =
    null;
  if (userId) {
    const rec = await getPicks(board.jornadaKey, userId);
    const picks = rec?.picks ?? {};
    const s = scoreUser(board, picks);
    mine = { picks, points: s.points, played: s.played, count: s.count };
  }

  return NextResponse.json(
    { board, leaderboard, mine },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
