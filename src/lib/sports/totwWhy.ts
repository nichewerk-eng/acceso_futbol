/**
 * One-line “why this Acceso Index” for each AF://ONCE player,
 * plus 1–2 sentences for the equipo de la jornada.
 * Facts from the sealed match (score + events). Copy from Anthropic when the key is on.
 */
import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
import { getCache, setCache, singleFlight } from '@/lib/apiCache';
import { fetchMatchTick } from '@/lib/sports/sportmonks';
import type { LiveEvent, MatchSnapshot } from '@/lib/sports/types';
import type { TotwBoard, TotwClub, TotwPlayer } from '@/lib/sports/totw';

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

export function fallbackTeamPickedWhy(t: TotwClub): string {
  const score = `${t.gf}-${t.ga}`;
  const vs = t.opponentName || t.opponentAbbr;
  const venue = t.home ? `en casa contra ${vs}` : `de visita contra ${vs}`;
  let result = `cerró ${score} ${venue}`;
  if (t.result === 'W') result = `ganó ${score} ${venue}`;
  else if (t.result === 'D') result = `empató ${score} ${venue}`;
  else if (t.result === 'L') result = `perdió ${score} ${venue}`;

  const extras: string[] = [];
  if (t.result === 'W' && t.ga === 0) extras.push('portería en cero');
  if (t.pos != null && t.opponentPos != null) {
    extras.push(`${t.name} es ${t.pos}° y ${vs} es ${t.opponentPos}°`);
  }
  const extra = extras.length ? `, ${extras.join(', ')}` : '';
  return `${t.name} es el equipo de la jornada: ${result}${extra}. Acceso ${t.score.toFixed(2)} premia el marcador, los goles y el rival.`;
}

function foldEs(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** True when copy invents a tabla climb or smashes a score into "2, 0". */
export function teamWhyLooksWrong(text: string, t: TotwClub): boolean {
  const fold = foldEs(text);
  if (/escal/.test(fold)) return true;
  if (/subio del/.test(fold) || /paso del/.test(fold) || /trep/.test(fold)) return true;
  if (/logaritm/.test(fold) || /residual/.test(fold) || /\bomega\b/.test(fold)) return true;
  if (/\d,\s*\d/.test(text)) return true;
  if (t.pos != null && t.opponentPos != null && t.pos < t.opponentPos) {
    const climb = new RegExp(`del\\s+${t.opponentPos}[^0-9]{0,12}${t.pos}`);
    if (climb.test(fold)) return true;
  }
  const gap =
    t.pos != null && t.opponentPos != null ? Math.abs(t.pos - t.opponentPos) : 0;
  if (gap > 3 && /rival directo/.test(fold)) return true;
  return false;
}

function clampSentences(raw: string, n: number): string {
  const parts = scrubWhy(raw)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.slice(0, n).join(' ');
}

function clubChip(t: TotwClub) {
  const vs = t.opponentName || t.opponentAbbr;
  const verb =
    t.result === 'W' ? 'ganó' : t.result === 'D' ? 'empató' : 'perdió';
  return {
    club: t.name,
    acceso: Number(t.score.toFixed(2)),
    partido: `${verb} ${t.gf}-${t.ga} ${t.home ? 'en casa' : 'de visita'} contra ${vs}`,
    porteriaEnCero: t.ga === 0,
    tablaDeEsteClub:
      t.pos != null ? `${t.name} es ${t.pos}° en la tabla hoy. No subió de otra posición en este partido.` : null,
    tablaDelRival:
      t.opponentPos != null ? `${vs} es ${t.opponentPos}° en la tabla hoy.` : null,
  };
}

function parseTeamWhy(raw: string): string | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) return null;
  try {
    const json = JSON.parse(raw.slice(start, end + 1)) as { why?: string };
    const why = json.why?.trim();
    return why ? clampSentences(why, 2) : null;
  } catch {
    return null;
  }
}

async function writeTeamWithAnthropic(
  picked: TotwClub,
  field: TotwClub[],
  jornada: number | null
): Promise<string | null> {
  if (!anthropicEnabled()) return null;

  const raw = await Promise.race([
    anthropicChat({
      system: `Eres editor de Acceso Futbol para el SITIO, no para VO.
Acentos ON. Nunca uses em-dash (—). Punto o coma. Marcador con guion ASCII: 2-0, nunca "2, 0".
Dos frases máximo, 45 palabras en total, tercera persona.
Explica POR QUÉ este club es el equipo de la jornada Acceso (el #1).
Acceso Ω paga el marcador contra lo esperado (tabla, PPG, localía) y los goles con retornos lentos. Un 5-2 puede ganar a un 2-0. La portería en cero NO gana sola.
Habla como editor Acceso, no como paper. PROHIBIDO en la prosa: logarítmico, residual, Omega, Ω, We, tanh.

tablaDeEsteClub y tablaDelRival son lugares ACTUALES, no un movimiento.
PROHIBIDO: escalar, subir de X a Y, "del 12 al 2", "rival directo", inventar goles, xG u otros partidos.
No hables de jugadores de la once. No digas "creo" ni "para mí".

Responde SOLO JSON:
{"why":"..."}`,
      user: JSON.stringify({
        kind: 'totw-team-why',
        jornada,
        picked: clubChip(picked),
        field: field.slice(0, 4).map(clubChip),
      }),
      temperature: 0.2,
      maxTokens: 220,
    }),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), AI_WAIT_MS);
    }),
  ]);

  if (!raw) return null;
  const why = parseTeamWhy(raw);
  if (!why || teamWhyLooksWrong(why, picked)) return null;
  return why;
}

function scrubWhy(raw: string): string {
  return raw
    .replace(/(\d)[—–](\d)/g, '$1-$2')
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

type WhyPack = {
  players: Record<string, string>;
  teamPicked?: string;
};

async function buildReasons(board: TotwBoard): Promise<WhyPack> {
  const byId = await factsMap(board.players.map((p) => p.fixtureId));

  const dossiers = board.players.map((p) =>
    dossierFor(
      p,
      p.fixtureId ? byId.get(p.fixtureId) ?? null : null,
      board.jornada,
      board.players.filter((x) => x.fixtureId && x.fixtureId === p.fixtureId)
    )
  );
  const players: Record<string, string> = {};
  for (const d of dossiers) players[d.id] = fallbackWhy(d);

  const picked = board.teams[0] ?? null;
  const teamFallback = picked ? fallbackTeamPickedWhy(picked) : undefined;

  const [ai, teamAi] = await Promise.all([
    writeWithAnthropic(dossiers),
    picked
      ? writeTeamWithAnthropic(picked, board.teams.slice(1), board.jornada)
      : Promise.resolve(null),
  ]);

  if (ai) {
    for (const [id, why] of Object.entries(ai)) {
      if (why) players[id] = why;
    }
  }

  return {
    players,
    teamPicked: teamAi || teamFallback,
  };
}

function applyWhy(board: TotwBoard, pack: WhyPack): TotwBoard {
  const players = board.players.map((p) => ({
    ...p,
    why: pack.players[p.id] || p.why,
  }));
  const ranking = [...players].sort((a, b) => a.rank - b.rank);
  const teams = board.teams.map((t, i) =>
    i === 0 && pack.teamPicked ? { ...t, pickedWhy: pack.teamPicked } : t
  );
  return {
    ...board,
    players,
    ranking,
    mvp: ranking[0] ?? null,
    teams,
    teamOfWeek: teams[0] ?? null,
  };
}

/** Attach cached why-lines. Never fails the board. */
export async function attachTotwWhy(board: TotwBoard): Promise<TotwBoard> {
  if (!board.published || board.players.length === 0) return board;
  const key = `totw-why-v12-omega-${board.roundId ?? board.jornada ?? 'x'}`;
  try {
    const pack = await singleFlight(key, WHY_TTL_MS, () => buildReasons(board));
    return applyWhy(board, pack);
  } catch {
    const picked = board.teams[0];
    if (!picked) return board;
    return applyWhy(board, {
      players: {},
      teamPicked: fallbackTeamPickedWhy(picked),
    });
  }
}
