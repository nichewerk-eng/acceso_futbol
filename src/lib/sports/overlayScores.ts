import { dayPairKey } from './ligaMxAbbr';
import type { Fixture } from './types';

/** Copy live state/score/clock onto a board row. Safe for client + server. */
export function overlayLiveScores<T extends Fixture>(base: T[], live: Fixture[]): T[] {
  if (!live.length) return base;
  const byId = new Map(live.map((f) => [f.id, f]));
  const seen = new Set<string>();
  const merged = base.map((f) => {
    const l =
      byId.get(f.id) ??
      live.find(
        (x) =>
          dayPairKey(x.date, x.home.abbreviation, x.away.abbreviation) ===
          dayPairKey(f.date, f.home.abbreviation, f.away.abbreviation)
      );
    if (!l) return f;
    seen.add(l.id);
    return {
      ...f,
      id: l.id,
      provider: l.provider,
      state: l.state,
      statusLabel: l.statusLabel,
      clock: l.clock ?? f.clock,
      winnerSide: l.winnerSide ?? f.winnerSide,
      scorers: l.scorers ?? f.scorers,
      home: {
        ...f.home,
        id: l.home.id,
        score: l.home.score,
        logo: l.home.logo ?? f.home.logo,
      },
      away: {
        ...f.away,
        id: l.away.id,
        score: l.away.score,
        logo: l.away.logo ?? f.away.logo,
      },
    };
  });
  for (const l of live) {
    if (!seen.has(l.id) && l.state === 'in') merged.push(l as T);
  }
  return merged;
}
