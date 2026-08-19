/**
 * One-line “why this Acceso Index” for each AF://ONCE player.
 * Facts from the sealed match (score + events). Copy from Anthropic when the key is on.
 */
import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
import { getCache, setCache, singleFlight } from '@/lib/apiCache';
import { fetchMatchTick } from '@/lib/sports/sportmonks';
import type { LiveEvent, MatchSnapshot } from '@/lib/sports/types';
import type { TotwBoard, TotwPlayer } from '@/lib/sports/totw';

const WHY_TTL_MS = 24 * 60 * 60_000;
const FACTS_TTL_MS = 24 * 60 * 60_000;
const AI_WAIT_MS = 8_000;

type MatchFacts = {
  id: string;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
  homeScore: string;
  awayScore: string;
  events: LiveEvent[];
};

type PlayerDossier = {
  id: string;
  name: string;
  rating: number;
  smRating?: number;
  teamScore?: number;
  accesoIndex?: number;
  rank: number;
  position: string;
  jornada: number | null;
  fixtureId: string;
  team: string;
  opponent: string;
  home: boolean;
  score: string;
  goals: string[];
  assists: string[];
  cards: string[];
  notes: string[];
};

function fold(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(raw: string): string[] {
  return fold(raw)
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function lastNameOf(player: TotwPlayer): string {
  return tokens(player.shortName).pop() || tokens(player.name).pop() || '';
}

function namesTouch(
  label: string | undefined,
  player: TotwPlayer,
  sameMatch: TotwPlayer[]
): boolean {
  if (!label) return false;
  const eventToks = tokens(label);
  if (!eventToks.length) return false;
  const eLast = eventToks[eventToks.length - 1] ?? '';
  const pLast = lastNameOf(player);
  if (eLast.length < 3 || pLast.length < 3 || eLast !== pLast) return false;
  const clash = sameMatch.some((t) => t.id !== player.id && lastNameOf(t) === pLast);
  if (!clash) return true;
  const eFirst = eventToks[0] ?? '';
  const pFirst = tokens(player.name)[0] ?? '';
  return eFirst.charAt(0) === pFirst.charAt(0);
}

function eventHitsPlayer(
  e: LiveEvent,
  player: TotwPlayer,
  sameMatch: TotwPlayer[],
  asRelated = false
): boolean {
  return namesTouch(asRelated ? e.relatedPlayerName : e.playerName, player, sameMatch);
}

function posLabel(pos: TotwPlayer['position']): string {
  if (pos === 'GK') return 'portero';
  if (pos === 'DEF') return 'defensa';
  if (pos === 'FWD') return 'delantero';
  return 'medio';
}

function scoreLine(facts: MatchFacts): string {
  return `${facts.homeAbbr} ${facts.homeScore}-${facts.awayScore} ${facts.awayAbbr}`;
}

function chipFromSnap(snap: MatchSnapshot): MatchFacts {
  return {
    id: snap.id,
    homeAbbr: snap.home.abbreviation,
    awayAbbr: snap.away.abbreviation,
    homeName: snap.home.name,
    awayName: snap.away.name,
    homeScore: snap.home.score ?? '0',
    awayScore: snap.away.score ?? '0',
    events: snap.events ?? [],
  };
}

async function factsFor(fixtureId: string): Promise<MatchFacts | null> {
  const key = `totw-match-facts-v1-${fixtureId}`;
  const hit = getCache<MatchFacts>(key, FACTS_TTL_MS);
  if (hit) return hit;
  try {
    const snap = await fetchMatchTick(fixtureId);
    if (!snap) return null;
    const facts = chipFromSnap(snap);
    setCache(key, facts);
    return facts;
  } catch {
    return null;
  }
}

async function factsMap(ids: string[]): Promise<Map<string, MatchFacts | null>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, MatchFacts | null>();
  const pool = 4;
  for (let i = 0; i < unique.length; i += pool) {
    const chunk = unique.slice(i, i + pool);
    const chips = await Promise.all(chunk.map((id) => factsFor(id)));
    chunk.forEach((id, idx) => out.set(id, chips[idx] ?? null));
  }
  return out;
}

function dossierFor(
  player: TotwPlayer,
  facts: MatchFacts | null,
  jornada: number | null,
  sameMatch: TotwPlayer[]
): PlayerDossier {
  const match =
    facts && player.fixtureId && facts.id === player.fixtureId ? facts : null;
  const home = match ? player.teamAbbr === match.homeAbbr : true;
  const opponent = match ? (home ? match.awayName : match.homeName) : '';
  const score = match ? scoreLine(match) : '';
  const events = (match?.events ?? []).filter(
    (e) => !e.teamAbbr || e.teamAbbr === player.teamAbbr
  );
  const goals: string[] = [];
  const assists: string[] = [];
  const cards: string[] = [];
  const notes: string[] = [];

  for (const e of events) {
    if ((e.kind === 'goal' || e.kind === 'penalty') && eventHitsPlayer(e, player, sameMatch)) {
      const clock = e.clock || '';
      goals.push(e.kind === 'penalty' ? `penal ${clock}`.trim() : clock || 'gol');
    }
    if (
      (e.kind === 'goal' || e.kind === 'penalty') &&
      eventHitsPlayer(e, player, sameMatch, true)
    ) {
      assists.push(e.clock || 'asistencia');
    }
    if ((e.kind === 'yellow' || e.kind === 'red') && eventHitsPlayer(e, player, sameMatch)) {
      cards.push(`${e.kind === 'red' ? 'roja' : 'amarilla'} ${e.clock}`.trim());
    }
    if (e.kind === 'own_goal' && eventHitsPlayer(e, player, sameMatch)) {
      notes.push(`autogol ${e.clock}`.trim());
    }
  }

  return {
    id: player.id,
    name: player.name,
    rating: player.rating,
    smRating: player.smRating,
    teamScore: player.teamScore,
    accesoIndex: player.acceso?.index ?? player.rating,
    rank: player.rank,
    position: posLabel(player.position),
    jornada,
    fixtureId: player.fixtureId,
    team: player.teamName,
    opponent,
    home,
    score,
    goals,
    assists,
    cards,
    notes,
  };
}

function fallbackWhy(d: PlayerDossier): string {
  const acceso = (d.accesoIndex ?? d.rating).toFixed(2);
  const sm = d.smRating != null ? d.smRating.toFixed(2) : null;
  const team = d.teamScore != null ? d.teamScore.toFixed(1) : null;
  const indexLine =
    sm && team
      ? `Acceso ${acceso} · SM ${sm} · equipo ${team}`
      : `Acceso ${acceso}`;
  const acts: string[] = [];
  if (d.goals.length === 1) {
    const g = d.goals[0];
    acts.push(
      g.startsWith('penal')
        ? `marcó de penal ${g.replace(/^penal\s*/, '')}`.trim()
        : `marcó al ${g}`
    );
  }
  if (d.goals.length > 1) {
    acts.push(`marcó ${d.goals.length} goles (${d.goals.join(', ')})`);
  }
  if (d.assists.length === 1) acts.push(`asistió al ${d.assists[0]}`);
  if (d.assists.length > 1) acts.push(`${d.assists.length} asistencias`);

  if (acts.length && d.score) {
    return `${acts.join(' y ')} en el ${d.score}. ${indexLine}.`;
  }
  if (d.score) {
    return `${indexLine} en el ${d.score}.`;
  }
  return `${indexLine}.`;
}

function scrubWhy(raw: string): string {
  return raw
    .replace(/[—–]/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
}

function parseReasons(raw: string): Record<string, string> {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) return {};
  try {
    const json = JSON.parse(raw.slice(start, end + 1)) as {
      reasons?: { id?: string; why?: string }[];
    };
    const out: Record<string, string> = {};
    for (const row of json.reasons ?? []) {
      if (row.id && row.why?.trim()) out[row.id] = scrubWhy(row.why);
    }
    return out;
  } catch {
    return {};
  }
}

async function writeWithAnthropic(
  dossiers: PlayerDossier[]
): Promise<Record<string, string> | null> {
  if (!anthropicEnabled()) return null;

  const raw = await Promise.race([
    anthropicChat({
      system: `Eres editor de Acceso Futbol para el SITIO, no para VO.
Acentos ON. Nunca uses em-dash (—). Punto o coma.
Una frase por jugador, máximo 26 palabras, tercera persona.
Usa SOLO el dossier de ESE jugador: jornada, fixtureId, marcador, goles, asistencias, Acceso index, SM rating, teamScore.
El número de la once es Acceso Index: 65% rating Sportmonks + 35% rendimiento del equipo (marcador, rival).
PROHIBIDO: temporada, carrera, jornadas anteriores, otros partidos, xG, paradas inventadas, “viene de”.
Si su equipo perdió, dilo. No conviertas una goleada en contra en un partidazo.
Si no hay goles ni asistencias, ancla el index al marcador y al puesto. Sin clichés vacíos.

Responde SOLO JSON:
{"reasons":[{"id":"...","why":"..."}]}`,
      user: JSON.stringify({
        kind: 'totw-why',
        jornada: dossiers[0]?.jornada ?? null,
        rule: 'Cada jugador solo existe dentro de su fixtureId. No cruces hechos.',
        players: dossiers,
      }),
      temperature: 0.35,
      maxTokens: 900,
    }),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), AI_WAIT_MS);
    }),
  ]);

  if (!raw) return null;
  return parseReasons(raw);
}

async function buildReasons(board: TotwBoard): Promise<Record<string, string>> {
  const byId = await factsMap(board.players.map((p) => p.fixtureId));

  const dossiers = board.players.map((p) =>
    dossierFor(
      p,
      p.fixtureId ? byId.get(p.fixtureId) ?? null : null,
      board.jornada,
      board.players.filter((x) => x.fixtureId && x.fixtureId === p.fixtureId)
    )
  );
  const fallback: Record<string, string> = {};
  for (const d of dossiers) fallback[d.id] = fallbackWhy(d);

  const ai = await writeWithAnthropic(dossiers);
  if (!ai) return fallback;

  const merged = { ...fallback };
  for (const [id, why] of Object.entries(ai)) {
    if (why) merged[id] = why;
  }
  return merged;
}

function applyWhy(board: TotwBoard, reasons: Record<string, string>): TotwBoard {
  const players = board.players.map((p) => ({
    ...p,
    why: reasons[p.id] || p.why,
  }));
  const ranking = [...players].sort((a, b) => a.rank - b.rank);
  return {
    ...board,
    players,
    ranking,
    mvp: ranking[0] ?? null,
  };
}

/** Attach cached why-lines. Never fails the board. */
export async function attachTotwWhy(board: TotwBoard): Promise<TotwBoard> {
  if (!board.published || board.players.length === 0) return board;
  const key = `totw-why-v6-${board.roundId ?? board.jornada ?? 'x'}`;
  try {
    const reasons = await singleFlight(key, WHY_TTL_MS, () => buildReasons(board));
    return applyWhy(board, reasons);
  } catch {
    return board;
  }
}
