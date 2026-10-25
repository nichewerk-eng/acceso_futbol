import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import { mexicoDayKey } from '@/lib/radio/phases';
import { APERTURA_MATCHDAYS, LIGUILLA_SPOTS } from '@/lib/sports/liguillaPath';
import type { JornadaOverview } from '@/lib/sports/jornada';
import { smTeamIdFromAbbr } from '@/lib/sports/ligaMxTeams';
import {
  fetchLigaMxStandings,
  fetchMatchContexto,
  sportmonksEnabled,
  type SmStandingEntry,
} from '@/lib/sports/sportmonks';
import type { Fixture, FormMatch, HeadToHeadSummary } from '@/lib/sports/types';
import type { TomaShowKind } from '@/lib/toma/episode';

/** What fans actually call the club on air. Anything missing uses the board name. */
const FAN_NAME: Record<string, string> = {
  chivas: 'Chivas',
  monterrey: 'Rayados',
  tijuana: 'Xolos',
  tigres: 'Tigres',
  pumas: 'Pumas',
  'san-luis': 'San Luis',
  juarez: 'Juárez',
};

const DERBIES: { clubs: [string, string]; name: string }[] = [
  { clubs: ['america', 'chivas'], name: 'Clásico Nacional' },
  { clubs: ['atlas', 'chivas'], name: 'Clásico Tapatío' },
  { clubs: ['america', 'cruz-azul'], name: 'Clásico Joven' },
  { clubs: ['america', 'pumas'], name: 'Clásico Capitalino' },
  { clubs: ['monterrey', 'tigres'], name: 'Clásico Regio' },
];

const HOUR_WORD = [
  'doce',
  'una',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
] as const;

const NUM_WORD = [
  'cero',
  'una',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
] as const;

export type TomaTablaRow = {
  pos: number;
  club: string;
  pts: number;
  gp: number;
  /** Points vs the 8th-place line. Positive = above it. */
  vsCorte: number;
  /** Ready-to-say line. The model repeats it rather than doing the math. */
  frase: string;
};

export type TomaPickSide = {
  club: string;
  pos: number | null;
  pts: number | null;
  /** "tercer lugar con 18 puntos" */
  tabla: string | null;
  /** "ganó 3, empató 1 y perdió 1 de sus últimos cinco; viene de ganar" */
  forma: string | null;
  /** "Si gana Chivas llega a 21, arriba de los 14 que hoy marcan el corte." */
  siGana: string | null;
  ptsSiGana: number | null;
};

export type TomaPick = {
  id: string;
  partido: string;
  clasico: string | null;
  cuando: string;
  estadio: string | null;
  tv: { mx: string | null; us: string | null };
  local: TomaPickSide;
  visita: TomaPickSide;
  ultimoDuelo: string | null;
  historial: string | null;
};

export type TomaNarrationFacts = {
  jornada: number;
  show: TomaShowKind;
  ahoraMexico: string;
  jornadasRestantes: string;
  partidosEnLaFecha: number;
  partidosPorJugar: number;
  tabla: {
    lideres: TomaTablaRow[];
    corte: TomaTablaRow | null;
    burbuja: TomaTablaRow[];
  } | null;
  picks: TomaPick[];
};

function clubKey(abbr: string): string | null {
  return clubIdentityFromAbbr(abbr)?.id ?? null;
}

export function fanName(abbr: string, fallback: string): string {
  const id = clubKey(abbr);
  return (id && FAN_NAME[id]) || fallback;
}

export function derbyName(homeAbbr: string, awayAbbr: string): string | null {
  const h = clubKey(homeAbbr);
  const a = clubKey(awayAbbr);
  if (!h || !a) return null;
  return (
    DERBIES.find(
      ({ clubs: [x, y] }) => (x === h && y === a) || (x === a && y === h)
    )?.name ?? null
  );
}

function clockIn(iso: string, timeZone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  return {
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((p) => p.type === 'minute')?.value ?? 0),
  };
}

/** "siete de la noche", "siete y media de la noche". Odd minutes round to the hour. */
export function spokenClock(iso: string, timeZone: string): string {
  const { hour, minute } = clockIn(iso, timeZone);
  let h = hour;
  let half = false;
  if (minute >= 45) h = (h + 1) % 24;
  else if (minute >= 20) half = true;
  if (h === 12 && !half) return 'mediodía';
  if (h === 0 && !half) return 'medianoche';
  const word = `${HOUR_WORD[h % 12]!}${half ? ' y media' : ''}`;
  if (h < 12) return `${word} de la mañana`;
  if (h < 19) return `${word} de la tarde`;
  return `${word} de la noche`;
}

function dayWord(iso: string, now: number): string {
  const day = mexicoDayKey(new Date(iso));
  const today = mexicoDayKey(new Date(now));
  const tomorrow = mexicoDayKey(new Date(now + 24 * 60 * 60_000));
  if (day === today) return 'hoy';
  if (day === tomorrow) return 'mañana';
  return new Date(iso)
    .toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long' })
    .toLowerCase();
}

/** Mexico first, then US Central. One zone when both clocks agree. */
export function spokenKickoff(iso: string, now = Date.now()): string {
  const day = dayWord(iso, now);
  const mx = spokenClock(iso, 'America/Mexico_City');
  const us = spokenClock(iso, 'America/Chicago');
  if (mx === us) return `${day} a las ${mx}, hora del Centro`;
  const usShort = us.replace(/ de la (mañana|tarde|noche)$/, '');
  return `${day} a las ${mx} hora de México, ${usShort} en el centro de Estados Unidos`;
}

const ORDINAL = [
  '',
  'primer',
  'segundo',
  'tercer',
  'cuarto',
  'quinto',
  'sexto',
  'séptimo',
  'octavo',
  'noveno',
  'décimo',
] as const;

export function spokenPlace(pos: number): string {
  return ORDINAL[pos] ? `${ORDINAL[pos]} lugar` : `lugar ${pos}`;
}

function ptsWord(n: number): string {
  return n === 1 ? 'un punto' : `${n} puntos`;
}

function corteFrase(row: SmStandingEntry, club: string, cut: SmStandingEntry, cutClub: string): string {
  const gap = row.pts - cut.pts;
  if (row.position === LIGUILLA_SPOTS) {
    return `${club} marca el corte en ${spokenPlace(row.position)} con ${ptsWord(row.pts)}.`;
  }
  if (gap === 0) {
    const side = row.position < LIGUILLA_SPOTS ? 'adentro' : 'afuera';
    return `${club} tiene ${ptsWord(row.pts)}, los mismos que ${cutClub} en el octavo lugar, y hoy está ${side} por diferencia de goles.`;
  }
  if (gap < 0) {
    return `${club} está en ${spokenPlace(row.position)} con ${ptsWord(row.pts)}, a ${ptsWord(-gap)} del octavo lugar.`;
  }
  return `${club} está en ${spokenPlace(row.position)} con ${ptsWord(row.pts)}, ${ptsWord(gap)} arriba del corte.`;
}

function remainingLine(jornada: number, kind: TomaShowKind): string {
  const after = Math.max(0, APERTURA_MATCHDAYS - jornada);
  const word = (n: number) => NUM_WORD[n] ?? String(n);
  if (kind === 'cierre') {
    if (after === 0) return 'Se acabó el torneo regular.';
    return after === 1
      ? 'Después de esta jornada queda una más.'
      : `Después de esta jornada quedan ${word(after)}.`;
  }
  const withThis = after + 1;
  return withThis === 1
    ? 'Es la última jornada del torneo regular.'
    : `Quedan ${word(withThis)} jornadas contando esta.`;
}

function buildTabla(entries: SmStandingEntry[]): TomaNarrationFacts['tabla'] {
  if (entries.length < LIGUILLA_SPOTS + 1) return null;
  const cut = entries[LIGUILLA_SPOTS - 1]!;
  const cutClub = fanName(cut.team.abbreviation, cut.team.name);
  const topPts = entries[0]!.pts;
  const row = (e: SmStandingEntry): TomaTablaRow => {
    const club = fanName(e.team.abbreviation, e.team.name);
    return {
      pos: e.position,
      club,
      pts: e.pts,
      gp: e.gp,
      vsCorte: e.pts - cut.pts,
      frase: corteFrase(e, club, cut, cutClub),
    };
  };
  const lideres = entries.filter((e) => e.pts === topPts).map(row);
  const names = lideres.map((r) => r.club);
  const leadNames =
    names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0]!;
  if (lideres[0]) {
    lideres[0].frase =
      names.length > 1
        ? `${leadNames} van arriba con ${ptsWord(topPts)}.`
        : `${leadNames} es líder con ${ptsWord(topPts)}.`;
  }
  return {
    lideres,
    corte: row(cut),
    burbuja: entries.slice(LIGUILLA_SPOTS, LIGUILLA_SPOTS + 3).map(row),
  };
}

function formLine(form: FormMatch[]): string | null {
  const last = form.slice(0, 5);
  if (!last.length) return null;
  const count = (r: FormMatch['result']) => last.filter((m) => m.result === r).length;
  const w = count('W');
  const d = count('D');
  const l = count('L');
  const n = NUM_WORD[last.length] ?? String(last.length);
  const latest = last[0]!.result;
  const streak = last.findIndex((m) => m.result !== latest);
  const run = streak === -1 ? last.length : streak;
  const runBit =
    run >= 3
      ? `viene de ${NUM_WORD[run]} ${{ W: 'victorias', D: 'empates', L: 'derrotas' }[latest]} seguidas`
      : `viene de ${{ W: 'ganar', D: 'empatar', L: 'perder' }[latest]}`;
  return `ganó ${w}, empató ${d} y perdió ${l} de sus últimos ${n}; ${runBit}`;
}

function meetingDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function h2hLines(
  h2h: HeadToHeadSummary | null,
  homeName: string,
  awayName: string
): { ultimoDuelo: string | null; historial: string | null } {
  const last = h2h?.meetings[0];
  if (!h2h || !last) return { ultimoDuelo: null, historial: null };
  const lastHome = fanName(last.homeAbbr, last.homeName);
  const lastAway = fanName(last.awayAbbr, last.awayName);
  const when = meetingDate(last.date);
  const ultimoDuelo = `${lastHome} ${last.homeScore}, ${lastAway} ${last.awayScore}${when ? `, el ${when}` : ''}`;
  const wins = (n: number) => (n === 1 ? 'una victoria' : `${n} victorias`);
  const draws = h2h.draws === 1 ? 'un empate' : `${h2h.draws} empates`;
  const historial = `En los últimos ${h2h.played} duelos, todas las competencias: ${homeName} ${wins(h2h.homeWins)}, ${awayName} ${wins(h2h.awayWins)} y ${draws}`;
  return { ultimoDuelo, historial };
}

function stakeScore(f: Fixture, byAbbr: Map<string, SmStandingEntry>): number {
  let n = derbyName(f.home.abbreviation, f.away.abbreviation) ? 100 : 0;
  const pos = [f.home, f.away].map((t) => byAbbr.get(clubKey(t.abbreviation) ?? '')?.position);
  for (const p of pos) {
    if (p != null && p >= LIGUILLA_SPOTS - 2 && p <= LIGUILLA_SPOTS + 3) n += 20;
  }
  if (pos.every((p) => p != null && p <= 4)) n += 30;
  if (pos[0] != null && pos[1] != null) n += Math.max(0, 6 - Math.abs(pos[0] - pos[1]));
  return n;
}

/** Derby first, then games on the corte line. The next day on the slate always gets one. */
function pickFixtures(
  upcoming: Fixture[],
  byAbbr: Map<string, SmStandingEntry>,
  limit: number
): Fixture[] {
  const pre = upcoming
    .filter((f) => f.state === 'pre')
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  if (pre.length === 0) return [];
  const ranked = [...pre].sort((a, b) => stakeScore(b, byAbbr) - stakeScore(a, byAbbr));
  const picks = ranked.slice(0, limit);
  const firstDay = mexicoDayKey(new Date(pre[0]!.date));
  const hasFirstDay = picks.some((f) => mexicoDayKey(new Date(f.date)) === firstDay);
  if (!hasFirstDay) {
    const opener = ranked.find((f) => mexicoDayKey(new Date(f.date)) === firstDay);
    if (opener) picks[picks.length - 1] = opener;
  }
  return picks.sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

async function pickFacts(
  f: Fixture,
  byAbbr: Map<string, SmStandingEntry>,
  now: number
): Promise<TomaPick> {
  const homeName = fanName(f.home.abbreviation, f.home.name);
  const awayName = fanName(f.away.abbreviation, f.away.name);
  const homeId = smTeamIdFromAbbr(f.home.abbreviation);
  const awayId = smTeamIdFromAbbr(f.away.abbreviation);
  const ctx =
    homeId && awayId && sportmonksEnabled()
      ? await fetchMatchContexto(homeId, awayId, f.home.abbreviation, f.away.abbreviation).catch(
          () => null
        )
      : null;
  const cutPts = [...byAbbr.values()].find((e) => e.position === LIGUILLA_SPOTS)?.pts ?? null;
  const side = (abbr: string, name: string, form: FormMatch[] | undefined): TomaPickSide => {
    const row = byAbbr.get(clubKey(abbr) ?? '');
    const after = row ? row.pts + 3 : null;
    let siGana: string | null = null;
    if (after != null) {
      siGana =
        cutPts != null && row!.position > LIGUILLA_SPOTS && after > cutPts
          ? `Si gana ${name} llega a ${after}, arriba de los ${cutPts} que hoy marcan el corte.`
          : `Si gana ${name} llega a ${after} puntos.`;
    }
    return {
      club: name,
      pos: row?.position ?? null,
      pts: row?.pts ?? null,
      tabla: row ? `${spokenPlace(row.position)} con ${ptsWord(row.pts)}` : null,
      forma: formLine(form ?? []),
      siGana,
      ptsSiGana: after,
    };
  };
  return {
    id: f.id,
    partido: `${homeName} contra ${awayName}`,
    clasico: derbyName(f.home.abbreviation, f.away.abbreviation),
    cuando: spokenKickoff(f.date, now),
    estadio: f.venue ?? null,
    tv: { mx: f.dondeVer?.mx ?? null, us: f.dondeVer?.us ?? null },
    local: side(f.home.abbreviation, homeName, ctx?.form.home),
    visita: side(f.away.abbreviation, awayName, ctx?.form.away),
    ...h2hLines(ctx?.headToHead ?? null, homeName, awayName),
  };
}

/** Verified numbers and names the narrator may say. Anything else stays out of the script. */
export async function buildTomaNarrationFacts(
  jornada: JornadaOverview,
  kind: TomaShowKind,
  now = Date.now()
): Promise<TomaNarrationFacts> {
  const standings = sportmonksEnabled()
    ? await fetchLigaMxStandings().catch(() => null)
    : null;
  const entries = standings?.entries ?? [];
  const byAbbr = new Map(
    entries.map((e) => [clubKey(e.team.abbreviation) ?? e.team.abbreviation, e] as const)
  );
  const limit = kind === 'cierre' ? 0 : 3;
  const picks = await Promise.all(
    pickFixtures(jornada.upcoming, byAbbr, limit).map((f) => pickFacts(f, byAbbr, now))
  );
  const total = jornada.live.length + jornada.played.length + jornada.upcoming.length;
  return {
    jornada: jornada.number,
    show: kind,
    ahoraMexico: new Date(now).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    jornadasRestantes: remainingLine(jornada.number, kind),
    partidosEnLaFecha: total,
    partidosPorJugar: jornada.upcoming.length,
    tabla: entries.length ? buildTabla(entries) : null,
    picks,
  };
}

/** Every point total the script is allowed to say out loud. */
export function allowedPointTotals(facts: TomaNarrationFacts): Set<number> {
  const out = new Set<number>();
  const rows = [
    ...(facts.tabla?.lideres ?? []),
    ...(facts.tabla?.burbuja ?? []),
    ...(facts.tabla?.corte ? [facts.tabla.corte] : []),
  ];
  for (const r of rows) {
    out.add(r.pts);
    out.add(Math.abs(r.vsCorte));
  }
  for (const p of facts.picks) {
    for (const s of [p.local, p.visita]) {
      if (s.pts != null) out.add(s.pts);
      if (s.ptsSiGana != null) out.add(s.ptsSiGana);
    }
  }
  return out;
}
