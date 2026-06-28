'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface LiveGame {
  id: string;
  homeAbbr: string; homeName: string; homeScore: string | null;
  awayAbbr: string; awayName: string; awayScore: string | null;
  status: string; clock: string; league: string;
}

const FLAG: Record<string, string> = {
  MEX: '🇲🇽', KOR: '🇰🇷', CZE: '🇨🇿', RSA: '🇿🇦', CAN: '🇨🇦', BIH: '🇧🇦', SUI: '🇨🇭',
  BRA: '🇧🇷', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', HAI: '🇭🇹', MAR: '🇲🇦', PAR: '🇵🇾', TUR: '🇹🇷', AUS: '🇦🇺',
  USA: '🇺🇸', ECU: '🇪🇨', GER: '🇩🇪', CIV: '🇨🇮', CUW: '🇨🇼', NED: '🇳🇱', SWE: '🇸🇪',
  JPN: '🇯🇵', TUN: '🇹🇳', BEL: '🇧🇪', IRN: '🇮🇷', EGY: '🇪🇬', NZL: '🇳🇿', ESP: '🇪🇸',
  URU: '🇺🇾', KSA: '🇸🇦', CPV: '🇨🇻', NOR: '🇳🇴', FRA: '🇫🇷', SEN: '🇸🇳', IRQ: '🇮🇶',
  ARG: '🇦🇷', AUT: '🇦🇹', ALG: '🇩🇿', JOR: '🇯🇴', COL: '🇨🇴', POR: '🇵🇹', UZB: '🇺🇿',
  COD: '🇨🇩', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', CRO: '🇭🇷', PAN: '🇵🇦', GHA: '🇬🇭',
};
const flag = (a: string) => FLAG[a] ?? '🏳️';

async function fetchLiveGames(): Promise<LiveGame[]> {
  const games: LiveGame[] = [];
  const fetchers = [
    fetch('/api/fixtures').then(r => r.ok ? r.json() : null).then(d => {
      if (!d?.fixtures) return;
      for (const f of d.fixtures) {
        if (f.status.state === 'in') {
          games.push({ id: f.id, homeAbbr: f.home.abbreviation, homeName: f.home.name, homeScore: f.home.score, awayAbbr: f.away.abbreviation, awayName: f.away.name, awayScore: f.away.score, status: f.status.shortDetail, clock: f.status.displayClock ?? '', league: 'mundial' });
        }
      }
    }).catch(() => {}),
    fetch('/api/ligamx/fixtures').then(r => r.ok ? r.json() : null).then(d => {
      if (!d?.fixtures) return;
      for (const f of d.fixtures) {
        if (f.status.state === 'in') {
          games.push({ id: f.id, homeAbbr: f.home.abbreviation, homeName: f.home.name, homeScore: f.home.score, awayAbbr: f.away.abbreviation, awayName: f.away.name, awayScore: f.away.score, status: f.status.shortDetail, clock: f.status.displayClock ?? '', league: 'liga-mx' });
        }
      }
    }).catch(() => {}),
  ];
  await Promise.all(fetchers);
  return games;
}

export default function LiveTicker() {
  const [games, setGames] = useState<LiveGame[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    const live = await fetchLiveGames();
    setGames(live);
  }, []);

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [poll]);

  if (games.length === 0) return null;

  return (
    <div className="overflow-hidden bg-red-600 dark:bg-red-700 px-0 py-1.5">
      <div className="flex items-center gap-3 overflow-x-auto px-4 pb-0.5 no-scrollbar">
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/80">En vivo</span>
        </span>
        <span className="text-white/30 text-xs shrink-0">·</span>
        {games.map((g, i) => (
          <span key={g.id} className="flex shrink-0 items-center gap-2 text-xs text-white font-semibold">
            {i > 0 && <span className="text-white/30 text-xs mx-1">|</span>}
            <span>{flag(g.homeAbbr)} {g.homeAbbr}</span>
            <span className="font-bold tabular-nums">{g.homeScore ?? 0} – {g.awayScore ?? 0}</span>
            <span>{g.awayAbbr} {flag(g.awayAbbr)}</span>
            <span className="text-white/60 text-[10px]">{g.status}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
