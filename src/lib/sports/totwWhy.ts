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

export type PlayerDossier = {
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
  /** Goals for this player's team. */
  gf: number | null;
  /** Goals against this player's team. */
  ga: number | null;
  result: 'W' | 'D' | 'L' | null;
  cleanSheet: boolean;
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

function nScore(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
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
  sameMatch: TotwPlayer[],
  club?: TotwClub | null
): PlayerDossier {
  const match =
    facts && player.fixtureId && facts.id === player.fixtureId ? facts : null;
  const home = club ? club.home : match ? player.teamAbbr === match.homeAbbr : true;
  const opponent =
    club?.opponentName || (match ? (home ? match.awayName : match.homeName) : '');
  const score = match ? scoreLine(match) : '';
  const gf =
    club?.gf ?? (match ? (home ? nScore(match.homeScore) : nScore(match.awayScore)) : null);
  const ga =
    club?.ga ?? (match ? (home ? nScore(match.awayScore) : nScore(match.homeScore)) : null);
  const result: PlayerDossier['result'] =
    club?.result ??
    (gf == null || ga == null ? null : gf > ga ? 'W' : gf < ga ? 'L' : 'D');
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
    gf,
    ga,
    result,
    cleanSheet: ga === 0,
    goals,
    assists,
    cards,
    notes,
  };
}

function venueOf(d: PlayerDossier): string {
  if (!d.opponent) return '';
  return d.home ? `en casa contra ${d.opponent}` : `visitando a ${d.opponent}`;
}

function nightOf(d: PlayerDossier): string {
  const score = d.gf != null && d.ga != null ? `${d.gf}-${d.ga}` : '';
  const where = venueOf(d);
  const team = d.team || 'su equipo';
  const resultWord =
    d.result === 'W' ? 'victoria' : d.result === 'D' ? 'empate' : d.result === 'L' ? 'derrota' : '';
  const chunks = [resultWord, score, `de ${team}`, where].filter(Boolean);
  return chunks.join(' ');
}

export function fallbackPlayerWhy(d: PlayerDossier): string {
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

  if (d.position === 'portero' && d.gf != null && d.ga != null) {
    const night = nightOf(d);
    if (d.ga === 0) {
      return `No le metieron en la ${night}.`;
    }
    const conceded = d.ga === 1 ? 'Encajó un gol' : `Encajó ${d.ga} goles`;
    return `${conceded} en la ${night}.`;
  }

  if (d.score) {
    return `${indexLine} en el ${d.score}.`;
  }
  return `${indexLine}.`;
}

function yJoin(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

export function fallbackTeamPickedWhy(t: TotwClub, others: TotwClub[] = []): string {
  const vs = t.opponentName || t.opponentAbbr;
  const score = `${t.gf}-${t.ga}`;
  const where = t.home ? `en casa a` : `de visita a`;

  let first = `${t.name} es el equipo de la jornada: `;
  if (t.result === 'W' && t.gf >= 4) {
    first += `goleó ${score} ${where} ${vs}.`;
  } else if (t.result === 'W' && t.ga === 0 && !t.home) {
    first += `ganó ${score} de visita a ${vs} y no le metieron.`;
  } else if (t.result === 'W' && t.ga === 0) {
    first += `ganó ${score} en casa a ${vs} y no le metieron.`;
  } else if (t.result === 'W') {
    first += `ganó ${score} ${where} ${vs}.`;
  } else if (t.result === 'D') {
    first += `empató ${score} ${t.home ? 'en casa con' : 'de visita con'} ${vs}.`;
  } else {
    first += `perdió ${score} ${t.home ? 'en casa con' : 'de visita con'} ${vs}.`;
  }

  const twoNilRows = others
    .filter((row) => row.result === 'W' && row.ga === 0 && row.gf <= 2)
    .slice(0, 2);
  const twoNils = yJoin(twoNilRows.map((row) => row.name));
  const twoNilVerb = twoNilRows.length === 1 ? 'ganó' : 'ganaron';
  const twoNilScore =
    twoNilRows.length > 0 && twoNilRows.every((row) => row.gf === twoNilRows[0]?.gf)
      ? `${twoNilRows[0]?.gf}-0`
      : 'sin recibir';
  const homeThumps = others
    .filter((row) => row.result === 'W' && row.home && row.gf >= 4)
    .slice(0, 2);
  const thumpLine = yJoin(homeThumps.map((row) => `el ${row.gf}-${row.ga} de ${row.name}`));

  let second = '';
  if (t.gf >= 4 && twoNils) {
    second = `${t.gf} goles es lo más ruidoso de la fecha; ${twoNils} ${twoNilVerb} ${twoNilScore} y eso no alcanza.`;
  } else if (t.gf >= 4) {
    second = `${t.gf} goles es lo más ruidoso de la fecha, más que cualquier 2-0.`;
  } else if (t.result === 'W' && t.ga === 0 && !t.home) {
    second = `Tres puntos fuera, sin recibir, es el partido más limpio.`;
  } else if (t.result === 'W' && !t.home && t.gf >= 3 && thumpLine) {
    second = `${t.gf} de visita pesan más que ${thumpLine}.`;
  } else if (t.result === 'W' && t.ga === 0) {
    second = `Ganó y no le metieron.`;
  } else if (t.result === 'W') {
    second = `El marcador y el rival lo dejan arriba del resto.`;
  } else {
    second = `En esta fecha nadie tuvo una noche más clara.`;
  }

  return `${first} ${second}`;
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
  if (/modelo/.test(fold) || /retorno/.test(fold) || /validand/.test(fold)) return true;
  if (/puntuacion/.test(fold) || /formula/.test(fold) || /sin necesidad/.test(fold)) return true;
  if (/\bacceso\b/.test(fold) || /porteria en cero/.test(fold)) return true;
  if (/\d,\s*\d/.test(text)) return true;
  if (/desde el\s+\d/.test(fold) || /ante el\s+\d/.test(fold)) return true;
  if (/\d+\s*[°º]/.test(text)) return true;
  if (t.pos != null && t.opponentPos != null && t.pos < t.opponentPos) {
    const climb = new RegExp(`del\\s+${t.opponentPos}[^0-9]{0,12}${t.pos}`);
    if (climb.test(fold)) return true;
    if (/mejor posicion/.test(fold)) return true;
  }
  const gap =
    t.pos != null && t.opponentPos != null ? Math.abs(t.pos - t.opponentPos) : 0;
  if (gap > 3 && /rival directo/.test(fold)) return true;
  return false;
}

function claimsCleanSheet(fold: string): boolean {
  return (
    /porteria en cero/.test(fold) ||
    /valla invicta/.test(fold) ||
    /valla a cero/.test(fold) ||
    /arco en cero/.test(fold) ||
    /arco invict/.test(fold) ||
    /mantuvo el cero/.test(fold) ||
    /dejo (la |el )?(porteria|valla|arco) en cero/.test(fold) ||
    /sin recibir/.test(fold) ||
    /no recibio/.test(fold) ||
    /no le metieron/.test(fold) ||
    /sin goles en contra/.test(fold) ||
    /cero goles en contra/.test(fold) ||
    /imbatid/.test(fold)
  );
}

function scoresInText(text: string): [number, number][] {
  return [...text.matchAll(/(\d+)\s*[-–]\s*(\d+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

/** True when player copy invents a clean sheet or a score that didn't happen. */
export function playerWhyLooksWrong(text: string, d: PlayerDossier): boolean {
  const fold = foldEs(text);
  const sheet = claimsCleanSheet(fold);
  const mentioned = scoresInText(text);
  const bothScored = mentioned.some(([a, b]) => a > 0 && b > 0);

  if (sheet && d.ga != null && d.ga > 0) return true;
  if (sheet && bothScored) return true;
  if (/\d+\s+paradas/.test(fold) || /\d+\s+atajadas/.test(fold)) return true;
  if (/\batajo\s+\d+/.test(fold)) return true;

  if (d.gf != null && d.ga != null && mentioned.length) {
    const ok = mentioned.every(
      ([a, b]) => (a === d.gf && b === d.ga) || (a === d.ga && b === d.gf)
    );
    if (!ok) return true;
  }
  return false;
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
Usa SOLO el dossier de ESE jugador: jornada, fixtureId, marcador, gf, ga, cleanSheet, goles, asistencias, Acceso index, SM rating, teamScore.
gf/ga son goles a favor/en contra DEL EQUIPO DE ESTE JUGADOR. cleanSheet es true SOLO si ga === 0.
El número de la once es Acceso Index: 65% rating Sportmonks + 35% rendimiento del equipo (marcador, rival).
PROHIBIDO: temporada, carrera, jornadas anteriores, otros partidos, xG, paradas inventadas, “viene de”.
PROHIBIDO decir portería en cero, valla invicta, no le metieron, sin recibir, imbatido — salvo cleanSheet true.
Un 3-1 (ga=1) no es arco en cero. El portero concedió ga goles. No inventes atajadas ni números de saves.
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
  const clubByAbbr = new Map(board.teams.map((t) => [t.abbr, t]));

  const dossiers = board.players.map((p) =>
    dossierFor(
      p,
      p.fixtureId ? byId.get(p.fixtureId) ?? null : null,
      board.jornada,
      board.players.filter((x) => x.fixtureId && x.fixtureId === p.fixtureId),
      clubByAbbr.get(p.teamAbbr)
    )
  );
  const players: Record<string, string> = {};
  for (const d of dossiers) players[d.id] = fallbackPlayerWhy(d);

  const picked = board.teams[0] ?? null;
  const rest = board.teams.slice(1);
  const teamPicked = picked ? fallbackTeamPickedWhy(picked, rest) : undefined;

  const byPlayer = new Map(dossiers.map((d) => [d.id, d]));
  const ai = await writeWithAnthropic(dossiers);
  if (ai) {
    for (const [id, why] of Object.entries(ai)) {
      const d = byPlayer.get(id);
      if (!why || !d || playerWhyLooksWrong(why, d)) continue;
      players[id] = why;
    }
  }

  return {
    players,
    teamPicked,
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
  const key = `totw-why-v17-place-${board.roundId ?? board.jornada ?? 'x'}`;
  try {
    const pack = await singleFlight(key, WHY_TTL_MS, () => buildReasons(board));
    return applyWhy(board, pack);
  } catch {
    const picked = board.teams[0];
    if (!picked) return board;
    return applyWhy(board, {
      players: {},
      teamPicked: fallbackTeamPickedWhy(picked, board.teams.slice(1)),
    });
  }
}
