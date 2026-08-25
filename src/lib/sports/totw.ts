import { getCache, setCache, singleFlight } from '@/lib/apiCache';
import {
  buildAccesoRound,
  type AccesoRoundTeam,
  type AccesoRoundXi,
} from '@/lib/sports/accesoRound';
import { APERTURA_MATCHDAYS } from '@/lib/sports/liguillaPath';
import { smFetch } from '@/lib/sports/sm/client';
import { ligaMxSeasonId, sportmonksEnabled } from '@/lib/sports/sportmonks';
import { attachTotwWhy } from '@/lib/sports/totwWhy';
import type { LineupPos } from '@/lib/sports/types';

const ROUNDS_KEY = 'sm-ligamx-rounds-v1';
const ROUNDS_TTL_MS = 30 * 60_000;

export type TotwPlayer = {
  id: string;
  name: string;
  shortName: string;
  photo?: string;
  /** Acceso Index (kit / ranking). */
  rating: number;
  smRating?: number;
  teamScore?: number;
  acceso?: { sm: number; team: number; index: number };
  slot: number;
  position: LineupPos;
  formation: string;
  teamAbbr: string;
  teamName: string;
  fixtureId: string;
  rank: number;
  why?: string;
};

export type TotwClub = {
  abbr: string;
  name: string;
  score: number;
  result: 'W' | 'D' | 'L';
  gf: number;
  ga: number;
  home: boolean;
  opponentAbbr: string;
  opponentName: string;
  pos: number | null;
  opponentPos: number | null;
  rank: number;
  /** Short fact chip: Ganó 2–0 visita vs CAZ · 2° vs 12°. */
  why: string;
  /** 1–2 sentences on why this club is #1. Anthropic when the key is on. */
  pickedWhy?: string;
};

export type TotwBoard = {
  jornada: number | null;
  roundId: number | null;
  formation: string | null;
  published: boolean;
  pending: boolean;
  generatedAt: string;
  source: 'acceso' | 'empty';
  players: TotwPlayer[];
  ranking: TotwPlayer[];
  mvp: TotwPlayer | null;
  teams: TotwClub[];
  teamOfWeek: TotwClub | null;
  publishedJornadas: number[];
  pendingJornada: number | null;
};

type SmRound = {
  id: number;
  name: string;
  finished?: boolean;
};

function jornadaFromRoundName(name: string | undefined): number | null {
  const n = Number(String(name ?? '').replace(/\D/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchSeasonRounds(): Promise<SmRound[]> {
  const hit = getCache<SmRound[]>(ROUNDS_KEY, ROUNDS_TTL_MS);
  if (hit) return hit;
  return singleFlight(ROUNDS_KEY, ROUNDS_TTL_MS, async () => {
    const data = await smFetch<{ data?: SmRound[] }>(
      `/rounds/seasons/${ligaMxSeasonId()}`,
      { per_page: '50' },
      'catalog'
    );
    const rows = (data.data ?? [])
      .map((r) => ({ id: r.id, name: r.name, finished: r.finished }))
      .sort((a, b) => (jornadaFromRoundName(a.name) ?? 0) - (jornadaFromRoundName(b.name) ?? 0));
    setCache(ROUNDS_KEY, rows);
    return rows;
  });
}

function emptyBoard(partial: Partial<TotwBoard> = {}): TotwBoard {
  return {
    jornada: null,
    roundId: null,
    formation: null,
    published: false,
    pending: false,
    generatedAt: new Date().toISOString(),
    source: 'empty',
    players: [],
    ranking: [],
    mvp: null,
    teams: [],
    teamOfWeek: null,
    publishedJornadas: [],
    pendingJornada: null,
    ...partial,
  };
}

function boardFromAcceso(
  xi: AccesoRoundXi,
  teams: AccesoRoundTeam[],
  meta: {
    jornada: number | null;
    roundId: number | null;
    publishedJornadas: number[];
    pendingJornada: number | null;
  }
): TotwBoard {
  const players: TotwPlayer[] = xi.players.map((p) => ({
    id: p.id,
    name: p.name,
    shortName: p.shortName,
    photo: p.photo,
    rating: p.acceso,
    smRating: p.smRating,
    teamScore: p.teamScore,
    acceso: { sm: p.smRating, team: p.teamScore, index: p.acceso },
    slot: p.slot,
    position: p.position,
    formation: p.formation,
    teamAbbr: p.teamAbbr,
    teamName: p.teamName,
    fixtureId: p.fixtureId,
    rank: p.rank,
  }));
  const ranking = [...players].sort((a, b) => a.rank - b.rank);
  const clubs: TotwClub[] = teams;
  return {
    jornada: meta.jornada,
    roundId: meta.roundId,
    formation: xi.formation,
    published: players.length >= 11,
    pending: false,
    generatedAt: new Date().toISOString(),
    source: 'acceso',
    players,
    ranking,
    mvp: ranking[0] ?? null,
    teams: clubs,
    teamOfWeek: clubs[0] ?? null,
    publishedJornadas: meta.publishedJornadas,
    pendingJornada: meta.pendingJornada,
  };
}

async function roundIndex(): Promise<{
  rounds: SmRound[];
  byJornada: Map<number, SmRound>;
  finishedJornadas: number[];
  pendingJornada: number | null;
}> {
  const rounds = await fetchSeasonRounds();
  const byJornada = new Map<number, SmRound>();
  for (const r of rounds) {
    const n = jornadaFromRoundName(r.name);
    if (n) byJornada.set(n, r);
  }
  const finishedJornadas = [...byJornada.entries()]
    .filter(([, r]) => r.finished)
    .map(([n]) => n)
    .sort((a, b) => a - b);
  const pendingJornada =
    [...byJornada.entries()]
      .filter(([, r]) => r.finished)
      .map(([n]) => n)
      .sort((a, b) => b - a)[0] ?? null;

  return { rounds, byJornada, finishedJornadas, pendingJornada };
}

async function latestPublished(
  byJornada: Map<number, SmRound>,
  finished: number[]
): Promise<{ jornada: number; round: SmRound } | null> {
  for (const n of [...finished].sort((a, b) => b - a)) {
    const round = byJornada.get(n);
    if (!round) continue;
    const packed = await buildAccesoRound(round.id, n).catch(() => null);
    if (packed?.xi && packed.xi.players.length >= 11) return { jornada: n, round };
  }
  return null;
}

/** Acceso Index XI for the latest sealed jornada, or a specific jornada. */
export async function getTotwBoard(jornada?: number | null): Promise<TotwBoard> {
  if (!sportmonksEnabled()) return emptyBoard();

  try {
    const idx = await roundIndex();
    const publishedHit = await latestPublished(idx.byJornada, idx.finishedJornadas);
    const publishedJornadas = publishedHit
      ? idx.finishedJornadas.filter((n) => n <= publishedHit.jornada)
      : [];
    const pendingJornada =
      idx.finishedJornadas.find((n) => publishedHit != null && n > publishedHit.jornada) ??
      (publishedHit ? null : idx.pendingJornada);

    const want =
      jornada != null && Number.isFinite(jornada) && jornada > 0
        ? Math.min(Math.floor(jornada), APERTURA_MATCHDAYS)
        : publishedHit?.jornada ?? null;

    if (want == null) {
      return emptyBoard({ publishedJornadas, pendingJornada });
    }

    const round = idx.byJornada.get(want);
    const meta = {
      jornada: want,
      roundId: round?.id ?? null,
      publishedJornadas,
      pendingJornada,
    };

    if (round && (publishedJornadas.includes(want) || round.finished)) {
      const packed = await buildAccesoRound(round.id, want).catch(() => null);
      if (packed?.xi && packed.xi.players.length >= 11) {
        return attachTotwWhy(boardFromAcceso(packed.xi, packed.teams, meta));
      }
      return emptyBoard({
        ...meta,
        pending: Boolean(round.finished),
      });
    }

    return emptyBoard({
      ...meta,
      pending: pendingJornada === want || Boolean(round?.finished),
    });
  } catch {
    return emptyBoard();
  }
}
