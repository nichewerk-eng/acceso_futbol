import { NextResponse } from 'next/server';
import { getAccount } from '@/lib/quiniela/account';
import { getSeasonView, rollupSeason } from '@/lib/quiniela/season';
import {
  boardFromFixtures,
  leaderboardFromPicks,
  sanitizeUserId,
  scoreUser,
} from '@/lib/quiniela/service';
import { listPicks } from '@/lib/quiniela/store';
import { fetchLigaMxFixtures } from '@/lib/sports/espnFallback';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Board + leaderboard + season (+ the caller's card/account when `?u=` is valid). */
export async function GET(req: Request) {
  const { fixtures } = await fetchLigaMxFixtures();
  const board = boardFromFixtures(fixtures);
  if (!board) return NextResponse.json({ error: 'no_jornada' }, { status: 404 });

  // Seal-time season rollup: cheap no-op unless a jornada just finished.
  await rollupSeason(fixtures);

  const all = await listPicks(board.jornadaKey);
  const leaderboard = all ? leaderboardFromPicks(board, all) : null;

  const userId = sanitizeUserId(new URL(req.url).searchParams.get('u'));
  let mine: { picks: Record<string, string>; points: number; played: number; count: number } | null =
    null;
  let account: { email: string } | null = null;
  if (userId) {
    // Same hash as the leaderboard — skip mine on a failed read so the client
    // keeps the last saved card instead of flashing empty.
    if (all) {
      const rec = all.find((p) => p.userId === userId);
      const picks = rec?.picks ?? {};
      const s = scoreUser(board, picks);
      mine = { picks, points: s.points, played: s.played, count: s.count };
    }
    const acc = await getAccount(userId);
    if (acc) account = { email: acc.email };
  }

  const season = await getSeasonView(userId);

  return NextResponse.json(
    { board, leaderboard, mine, account, season },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
