/**
 * Jornada Toma writer.
 * Voice & article shape: doc/ACCESO_FUTBOL_SCRIPT_GUIDE.md
 * (Section 0 website exception + Section 4 website recap).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
import { getCache, singleFlight } from '@/lib/apiCache';
import { aggregateStories } from '@/lib/news/aggregate';
import type { Story } from '@/lib/news/types';
import { mexicoDayKey } from '@/lib/radio/phases';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';
import { APERTURA_MATCHDAYS, LIGUILLA_SPOTS } from '@/lib/sports/liguillaPath';
import { getJornadaOverview, type JornadaOverview } from '@/lib/sports/jornada';
import {
  buildJornadaTake,
  type JornadaTake,
  type JornadaTakeBeat,
  type JornadaTakePhase,
} from '@/lib/sports/jornadaTake';
import {
  fetchLigaMxStandings,
  sportmonksEnabled,
  type SmStandingEntry,
} from '@/lib/sports/sportmonks';
import type { Fixture } from '@/lib/sports/types';

const LIVE_TTL_MS = 90_000;
const IDLE_TTL_MS = 15 * 60_000;

type CompactScorer = {
  name: string;
  minute: string;
  side: 'home' | 'away';
  tag: '' | 'P' | 'OG';
};

type CompactFixture = {
  id: string;
  home: string;
  away: string;
  homeName: string;
  awayName: string;
  state: Fixture['state'];
  score: string | null;
  clock: string | null;
  scorers: CompactScorer[];
  venue: string | null;
  date: string;
  dayKey: string;
  weekday: string;
  whenSpoken: string;
  pairSpoken: string;
  tv: { mx: string | null; us: string | null };
};

type TablaClub = {
  pos: number;
  abbr: string;
  name: string;
  pts: number;
  gp: number;
  gd: string;
  w: number;
  d: number;
  l: number;
  remaining: number;
  maxPts: number;
  eliminated: boolean;
};

type SlateDay = {
  dayKey: string;
  weekday: string;
  count: number;
  matches: {
    id: string;
    home: string;
    away: string;
    whenSpoken: string;
    pairSpoken: string;
    tv: CompactFixture['tv'];
    venue: string | null;
  }[];
};

type TomaDossier = {
  phase: JornadaTakePhase;
  jornada: { number: number; label: string };
  mexicoNow: string;
  tempo: string;
  slate: {
    total: number;
    window: string;
    lastKick: string | null;
    days: SlateDay[];
    rule: string;
  };
  fixtures: CompactFixture[];
  tabla: {
    season: string;
    matchdays: number;
    liguillaSpots: number;
    top: TablaClub[];
    involved: TablaClub[];
    cut: TablaClub | null;
    chase: TablaClub | null;
  } | null;
  wire: {
    source: string;
    title: string;
    summary: string;
    accesoLine: string;
  }[];
};

function phaseOf(j: JornadaOverview): JornadaTakePhase {
  if (j.live.length > 0) return 'live';
  if (j.played.length > 0) return 'recap';
  return 'preview';
}

export function tomaCacheKey(jornada: JornadaOverview): { key: string; ttlMs: number } {
  const phase = phaseOf(jornada);
  return {
    key: `toma-v5-j${jornada.number}-${phase}`,
    ttlMs: phase === 'live' ? LIVE_TTL_MS : IDLE_TTL_MS,
  };
}

const WIRE_SOURCES = new Set(['espn', 'espn-rss', 'mediotiempo', 'tudn', 'marca']);

function pickWire(stories: Story[], limit = 6): Story[] {
  const wire = stories.filter((s) => WIRE_SOURCES.has(s.sourceId));
  const pool = (wire.length ? wire : stories.filter((s) => s.sourceId !== 'acceso')).slice();
  pool.sort((a, b) => {
    const body = (b.summary?.trim().length ?? 0) - (a.summary?.trim().length ?? 0);
    if (body) return body;
    return +(b.publishedAt ? new Date(b.publishedAt) : 0) - +(a.publishedAt ? new Date(a.publishedAt) : 0);
  });
  return pool.slice(0, limit);
}

function mexicoHourMinute(iso: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  return {
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((p) => p.type === 'minute')?.value ?? 0),
  };
}

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

/** Voice-safe kickoff. Flatten :06 / :10 to the hour. Never "9:06 p.m." */
function spokenTimeMx(iso: string): string {
  const { hour, minute } = mexicoHourMinute(iso);
  let h = hour;
  if (minute >= 45) h = (h + 1) % 24;
  if (h === 12) return 'mediodía';
  if (h === 0) return 'medianoche';
  const word = HOUR_WORD[h % 12]!;
  if (h < 12) return `${word} de la mañana`;
  if (h < 19) return `${word} de la tarde`;
  return `${word} de la noche`;
}

function whenSpokenLabel(iso: string, weekday: string, now = Date.now()): string {
  const spoken = spokenTimeMx(iso);
  try {
    const day = mexicoDayKey(new Date(iso));
    const today = mexicoDayKey(new Date(now));
    const [y, m, dd] = today.split('-').map(Number);
    const yest = new Date(Date.UTC(y!, m! - 1, dd!));
    yest.setUTCDate(yest.getUTCDate() - 1);
    const yesterday = yest.toISOString().slice(0, 10);
    if (day === today) return `hoy a las ${spoken}`;
    if (day === yesterday) return `ayer a las ${spoken}`;
  } catch {
    /* weekday fallback */
  }
  return `${weekday} a las ${spoken}`;
}

function pairSpoken(homeName: string, awayName: string): string {
  return `${homeName} contra ${awayName}`;
}

function mexicoWeekday(iso: string): string {
  try {
    return new Date(iso)
      .toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long' })
      .toLowerCase();
  } catch {
    return '';
  }
}

function compactFixture(f: Fixture, now: number): CompactFixture {
  const pre = f.state === 'pre';
  const tvMx = f.dondeVer?.confirmed ? f.dondeVer.mx ?? null : f.dondeVer?.mx ?? null;
  const tvUs = f.dondeVer?.confirmed ? f.dondeVer.us ?? null : f.dondeVer?.us ?? null;
  const weekday = mexicoWeekday(f.date);
  return {
    id: f.id,
    home: scheduleAbbr(f.home.abbreviation),
    away: scheduleAbbr(f.away.abbreviation),
    homeName: f.home.name,
    awayName: f.away.name,
    state: f.state,
    score: pre ? null : `${f.home.score ?? 0}-${f.away.score ?? 0}`,
    clock: f.clock ?? null,
    scorers: (f.scorers ?? []).map((s) => ({
      name: s.name,
      minute: s.minute,
      side: s.side,
      tag: s.pen ? 'P' : s.og ? 'OG' : '',
    })),
    venue: f.venue ?? null,
    date: f.date,
    dayKey: mexicoDayKey(new Date(f.date)),
    weekday,
    whenSpoken: whenSpokenLabel(f.date, weekday, now),
    pairSpoken: pairSpoken(f.home.name, f.away.name),
    tv: { mx: tvMx, us: tvUs },
  };
}

function toTablaClub(e: SmStandingEntry, cutPts: number | null): TablaClub {
  const remaining = Math.max(0, APERTURA_MATCHDAYS - e.gp);
  const maxPts = remaining * 3;
  const pts = e.pts;
  const eliminated =
    e.position > LIGUILLA_SPOTS && cutPts != null && pts + maxPts < cutPts;
  return {
    pos: e.position,
    abbr: scheduleAbbr(e.team.abbreviation),
    name: e.team.name,
    pts,
    gp: e.gp,
    gd: e.gd,
    w: e.w,
    d: e.d,
    l: e.l,
    remaining,
    maxPts,
    eliminated,
  };
}

function buildTabla(
  entries: SmStandingEntry[] | undefined,
  jornada: JornadaOverview
): TomaDossier['tabla'] {
  if (!entries?.length) return null;
  const cutPts = entries[LIGUILLA_SPOTS - 1]?.pts ?? null;
  const clubs = entries.map((e) => toTablaClub(e, cutPts));
  const involvedAbbrs = new Set(
    [...jornada.live, ...jornada.played, ...jornada.upcoming].flatMap((f) => [
      scheduleAbbr(f.home.abbreviation),
      scheduleAbbr(f.away.abbreviation),
    ])
  );
  return {
    season: 'Apertura 2026',
    matchdays: APERTURA_MATCHDAYS,
    liguillaSpots: LIGUILLA_SPOTS,
    top: clubs.slice(0, LIGUILLA_SPOTS),
    involved: clubs.filter((c) => involvedAbbrs.has(c.abbr)),
    cut: clubs[LIGUILLA_SPOTS - 1] ?? null,
    chase: clubs[LIGUILLA_SPOTS] ?? null,
  };
}

function buildSlate(fixtures: CompactFixture[]): TomaDossier['slate'] {
  const sorted = [...fixtures].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const byDay = new Map<string, CompactFixture[]>();
  for (const f of sorted) {
    const list = byDay.get(f.dayKey) ?? [];
    list.push(f);
    byDay.set(f.dayKey, list);
  }
  const days: SlateDay[] = [...byDay.entries()].map(([dayKey, matches]) => ({
    dayKey,
    weekday: matches[0]?.weekday || '',
    count: matches.length,
    matches: matches.map((m) => ({
      id: m.id,
      home: m.home,
      away: m.away,
      whenSpoken: m.whenSpoken,
      pairSpoken: m.pairSpoken,
      tv: m.tv,
      venue: m.venue,
    })),
  }));
  const weekdays = days.map((d) => d.weekday).filter(Boolean);
  let window = 'la fecha';
  if (weekdays.length === 1) window = weekdays[0]!;
  else if (weekdays.length === 2) window = `${weekdays[0]} y ${weekdays[1]}`;
  else if (weekdays.length > 2) window = `${weekdays[0]} a ${weekdays[weekdays.length - 1]}`;
  const last = sorted[sorted.length - 1];
  const lastKick = last
    ? `${last.whenSpoken}, ${last.pairSpoken}`
    : null;
  return {
    total: sorted.length,
    window,
    lastKick,
    days,
    rule: `La jornada son ${sorted.length} duelos, ${window} (hora MX). NO es solo fin de semana. El dek y el párrafo 1 DEBEN nombrar ${window} y el cierre (${lastKick ?? 'último partido'}). Si hay lunes, dilo: el lunes cuenta.`,
  };
}

function tempoLine(phase: JornadaTakePhase): string {
  if (phase === 'live') {
    return 'Hay partido en vivo: puedes citar el reloj. No inventes el marcador si no está en fixtures.';
  }
  if (phase === 'recap') {
    return 'Hay resultados sellados. Usa when (hoy/ayer/fecha). PROHIBIDO "anoche" si when no dice ayer.';
  }
  return 'Previa: horarios y tabla. No inventes lesionados, xG, ni alineaciones.';
}

function buildDossier(
  jornada: JornadaOverview,
  stories: Story[],
  entries: SmStandingEntry[] | undefined,
  now = Date.now()
): TomaDossier {
  const phase = phaseOf(jornada);
  const mexicoNow = new Date(now).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
  const wire = pickWire(stories, 6).map((s) => ({
    source: s.sourceLabel,
    title: s.title,
    summary: (s.summary ?? '').slice(0, 280),
    accesoLine: s.accesoLine ?? '',
  }));

  const fixtures = [...jornada.live, ...jornada.played, ...jornada.upcoming].map((f) =>
    compactFixture(f, now)
  );

  return {
    phase,
    jornada: { number: jornada.number, label: jornada.label },
    mexicoNow,
    tempo: tempoLine(phase),
    slate: buildSlate(fixtures),
    fixtures,
    tabla: buildTabla(entries, jornada),
    wire,
  };
}

function scorerClause(f: CompactFixture): string {
  if (f.scorers.length === 0) return '';
  const bits = f.scorers.slice(0, 4).map((s) => {
    const tag = s.tag ? ` (${s.tag})` : '';
    return s.minute ? `${s.name} ${s.minute}'${tag}` : `${s.name}${tag}`;
  });
  return ` — ${bits.join(', ')}`;
}

function templateBody(d: TomaDossier): string[] {
  const paras: string[] = [];
  const live = d.fixtures.filter((f) => f.state === 'in');
  const played = d.fixtures.filter((f) => f.state === 'post');
  const upcoming = d.fixtures.filter((f) => f.state === 'pre');

  if (live.length) {
    paras.push(
      live
        .map((f) => {
          const clock = f.clock === 'HT' ? 'Descanso' : f.clock || 'LIVE';
          return `${f.home} ${f.score ?? '0-0'} ${f.away} (${clock})${scorerClause(f)}`;
        })
        .join('. ') + '.'
    );
  }

  if (played.length) {
    const lines = played.slice(0, 6).map((f) => {
      const when = f.whenSpoken ? ` ${f.whenSpoken}` : '';
      return `${f.home} ${f.score ?? '0-0'} ${f.away}${scorerClause(f)}${when}`;
    });
    paras.push(`Sellados: ${lines.join('. ')}.`);
  }

  if (upcoming.length && paras.length < 3) {
    const days = d.slate.days
      .map((day) => {
        const bits = day.matches.map((m) => `${m.pairSpoken}, ${m.whenSpoken}`).join(', ');
        return `${day.weekday} (${day.count}): ${bits}`;
      })
      .join('. ');
    paras.push(
      `${d.jornada.label}: ${d.slate.total} duelos, ${d.slate.window}. ${days}.`
    );
  }

  if (d.tabla?.cut && d.tabla.top[0]) {
    const lead = d.tabla.top[0];
    const cut = d.tabla.cut;
    const chase = d.tabla.chase;
    const near = d.tabla.involved
      .filter((c) => c.pos >= LIGUILLA_SPOTS - 2 && c.pos <= LIGUILLA_SPOTS + 2)
      .slice(0, 3)
      .map((c) => `${c.pos}º ${c.abbr} ${c.pts} pts`);
    const chaseBit = chase ? ` ${chase.abbr} persigue 9º con ${chase.pts}.` : '';
    const nearBit = near.length ? ` En la pelea de esta fecha: ${near.join(', ')}.` : '';
    paras.push(
      `${d.tabla.season}: 1º ${lead.abbr} con ${lead.pts} pts. El corte Liguilla (8º) lo marca ${cut.abbr} con ${cut.pts}.${chaseBit}${nearBit}`
    );
  }

  const wire = d.wire[0];
  if (wire && paras.length < 4) {
    const angle = wire.accesoLine || wire.summary;
    const extra = angle ? ` ${angle}` : '';
    paras.push(`${wire.source}: ${wire.title}.${extra}`);
  }

  return paras.filter((p) => p.trim().length > 12).slice(0, 4);
}

function templateCites(d: TomaDossier): string[] {
  const out: string[] = [];
  for (const w of d.wire.slice(0, 3)) {
    if (!out.includes(w.source)) out.push(w.source);
  }
  return out.slice(0, 4);
}

function killEmDash(s: string): string {
  return s.replace(/\s*[—–]\s*/g, '. ').replace(/\s{2,}/g, ' ').trim();
}

/** Strip digital clocks and (PAC–PUE) pairs. Voice cannot say them cleanly. */
function scrubClockNoise(text: string): string {
  return text
    .replace(/\(\s*[A-ZÁÉÍÓÚÜÑ]{2,4}\s*[–\-]\s*[A-ZÁÉÍÓÚÜÑ]{2,4}\s*\)/gi, '')
    .replace(/\b\d{1,2}:\d{2}\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)?/gi, '')
    .replace(/\b\d{1,2}\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .trim();
}

function clip(s: string, max: number): string {
  const t = killEmDash(scrubClockNoise(s.replace(/\s+/g, ' ').trim()));
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function sanitizeBody(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is string => typeof p === 'string')
    .map((p) =>
      clip(
        p
          .replace(/[*_#`]/g, '')
          .replace(/\btodavía no patean\b/gi, '')
          .trim(),
        640
      )
    )
    .filter((p) => p.length >= 40)
    .slice(0, 4);
}

type AiBeat = { id?: string; home?: string; away?: string; kicker?: string; line?: string };

function factualBeat(f: CompactFixture, tabla: TomaDossier['tabla']): JornadaTakeBeat {
  const home = tabla?.involved.find((c) => c.abbr === f.home);
  const away = tabla?.involved.find((c) => c.abbr === f.away);
  let line: string;
  if (f.state !== 'pre' && f.score) {
    line = `${f.home} ${f.score} ${f.away}${scorerClause(f)}`;
  } else if (home && away) {
    line = `${f.pairSpoken}, ${home.pts} puntos contra ${away.pts}`;
  } else if (f.venue) {
    line = `${f.pairSpoken} en ${f.venue}`;
  } else {
    line = f.pairSpoken;
  }
  return {
    id: f.id,
    kicker: f.state === 'pre' ? f.whenSpoken : f.score || f.whenSpoken,
    line: clip(line, 90),
    href: `/partido/liga-mx/${f.id}`,
  };
}

function overlayBeats(
  base: JornadaTakeBeat[],
  jornada: JornadaOverview,
  dossier: TomaDossier,
  aiBeats: AiBeat[] | undefined
): JornadaTakeBeat[] {
  const all = [...jornada.live, ...jornada.played, ...jornada.upcoming];
  const byId = new Map(base.map((b) => [b.id, b]));
  const compactById = new Map(dossier.fixtures.map((f) => [f.id, f]));
  const lastDay = dossier.slate.days.at(-1);

  const matched: JornadaTakeBeat[] = [];
  const used = new Set<string>();

  const pushFixture = (f: CompactFixture, line?: string, kicker?: string) => {
    if (used.has(f.id) || matched.length >= 3) return;
    const loc = byId.get(f.id) ?? factualBeat(f, dossier.tabla);
    used.add(f.id);
    matched.push({
      ...loc,
      kicker: kicker && kicker.trim() ? clip(scrubClockNoise(kicker), 40) : loc.kicker,
      line: line && line.trim() ? clip(line, 90) : factualBeat(f, dossier.tabla).line,
    });
  };

  for (const a of aiBeats ?? []) {
    const line = typeof a.line === 'string' ? clip(a.line, 90) : '';
    if (!line) continue;
    let f: CompactFixture | undefined;
    if (typeof a.id === 'string') f = compactById.get(a.id);
    if (!f) {
      const fx = all.find((row) => {
        if (used.has(row.id)) return false;
        const h = scheduleAbbr(row.home.abbreviation);
        const aw = scheduleAbbr(row.away.abbreviation);
        const ah = scheduleAbbr(String(a.home ?? ''));
        const aa = scheduleAbbr(String(a.away ?? ''));
        return Boolean(ah && aa && h === ah && aw === aa);
      });
      f = fx ? compactById.get(fx.id) : undefined;
    }
    if (f) pushFixture(f, line, typeof a.kicker === 'string' ? a.kicker : undefined);
    if (matched.length >= 3) break;
  }

  const hasLast =
    !lastDay ||
    lastDay.dayKey === dossier.slate.days[0]?.dayKey ||
    matched.some((b) => compactById.get(b.id)?.dayKey === lastDay.dayKey);
  if (!hasLast && lastDay) {
    const monday = dossier.fixtures.find((x) => x.dayKey === lastDay.dayKey && !used.has(x.id));
    if (monday) pushFixture(monday);
  }

  const chrono = [...dossier.fixtures].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  for (const f of chrono) {
    if (matched.length >= 3) break;
    pushFixture(f);
  }
  return matched.slice(0, 3);
}

type AiJson = {
  headline?: string;
  dek?: string;
  body?: unknown;
  beats?: AiBeat[];
};

function parseAiJson(raw: string): AiJson | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as AiJson;
  } catch {
    return null;
  }
}

const GUIDE_PATH = join(process.cwd(), 'doc/ACCESO_FUTBOL_SCRIPT_GUIDE.md');

let guideExcerpt: string | null = null;

function sliceGuide(raw: string, start: string, end: string): string {
  const a = raw.indexOf(start);
  if (a < 0) return '';
  const b = raw.indexOf(end, a + start.length);
  return raw.slice(a, b > a ? b : undefined).trim();
}

async function websiteGuideExcerpt(): Promise<string> {
  if (guideExcerpt != null) return guideExcerpt;
  try {
    const raw = await readFile(GUIDE_PATH, 'utf8');
    guideExcerpt = [
      sliceGuide(raw, '## 0. Universal Rules', '## 1. Juegos de Hoy'),
      sliceGuide(raw, '## 4. Writing the J4 recap', '## 5. Pre-publish QA'),
      sliceGuide(raw, '## 6. Voice cheat sheet', '## Production workflow'),
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 8000);
  } catch {
    guideExcerpt = '';
  }
  return guideExcerpt;
}

async function generateTake(dossier: TomaDossier): Promise<AiJson | null> {
  if (!anthropicEnabled()) return null;
  const anyoneOut = dossier.tabla?.involved.some((c) => c.eliminated) ?? false;
  const guide = await websiteGuideExcerpt();
  const raw = await anthropicChat({
    system: `Eres editor de Acceso Futbol. Escribes la TOMA de la jornada para el SITIO (columna), no un script de TikTok.

CANON = doc/ACCESO_FUTBOL_SCRIPT_GUIDE.md (secciones 0, 4 y 6). Síguelo:
${guide || '(guía no disponible: acentos ON, primera persona, un stat verificado, pregunta que divide, sin rayas largas.)'}

OVERRIDES DE PRODUCTO (ganan a la guía si chocan):
- Medio = website: acentos SÍ. NO uses "Preparense que arrancamos". NO quites acentos.
- NUNCA em-dash (—). Punto o coma.
- Apertura 2026: corte Liguilla = top ${LIGUILLA_SPOTS}. NO hay Play-In.
- Formato corto: headline + dek + 3 grafs + 3 beats. No un artículo de 18 bloques.
- Graf 1 cubre el slate COMPLETO (${dossier.slate.window}, ${dossier.slate.total} duelos) hasta ${dossier.slate.lastKick}. El lunes cuenta.
- Graf 2 = tabla / quién entra o sale del 8º. Un número verificado del dossier.
- Graf 3 = standout o cable citado + primera persona (yo creo / honestamente / para mí) + pregunta que divide (A/B o A/B/C).
- Cubre todos los partidos en graf 1, no solo América/Chivas/Cruz Azul.
- Horarios SOLO en palabras del dossier (whenSpoken): "hoy a las cinco de la tarde", "lunes a las nueve de la noche". Equipos en nombre completo (pairSpoken): "Pachuca contra Puebla".
- PROHIBIDO relojes digitales: "9:06 p.m.", "7:10", "5:00 p.m.", "19:00".
- PROHIBIDO pares de abreviaturas: "(PAC–PUE)", "PAC-PUE", "AME–SLP".
- Toma no lista horas de US. Dónde ver guarda el reloj exacto.
- PROHIBIDO: "sábado y domingo" / "fin de semana" si slate incluye lunes o viernes.
- PROHIBIDO eliminados/sin opciones salvo club.eliminated === true.${anyoneOut ? '' : ' Nadie está eliminado.'}
- PROHIBIDO como gancho: Márquez, Almada, Gignac, "Atlante regresó".
- INPUT = DOSSIER. No inventes marcadores, xG, lesiones ni alineaciones.

Responde SOLO JSON:
{
  "headline": "titular Acceso, máx 10 palabras, con acentos",
  "dek": "Jornada ${dossier.jornada.number} Liga MX. ${dossier.slate.window}. Cierre en palabras, sin reloj digital.",
  "body": ["graf1 slate completo con whenSpoken y pairSpoken", "graf2 tabla 8º", "graf3 yo creo + pregunta que divide"],
  "beats": [{"home":"AME","away":"SLP","kicker":"hoy a las siete de la noche","line":"mini-recap con pts, nombres completos"}]
}
3 beats. Si hay lunes, UNO es del lunes. kicker = whenSpoken, nunca "9:06 p.m.".`,
    user: JSON.stringify({ kind: 'jornada-toma-website', slate: dossier.slate, dossier }),
    temperature: 0.4,
    maxTokens: 1100,
  });
  if (!raw) return null;
  return parseAiJson(raw);
}

function scrubFalseMath(text: string, dossier: TomaDossier): string {
  const anyoneOut = dossier.tabla?.involved.some((c) => c.eliminated);
  if (anyoneOut) return text;
  return text
    .replace(/\s*eliminad[oa]s? matemáticamente[^.]*\.?/gi, '')
    .replace(/\s*ya sin opciones matemáticas[^.]*\.?/gi, '')
    .replace(/\ssin opciones matemáticas/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function patchWindowCopy(text: string, dossier: TomaDossier): string {
  const days = dossier.slate.days.map((d) => d.weekday);
  if (days.includes('lunes') && /sábado y domingo|fin de semana/i.test(text)) {
    return text
      .replace(/sábado y domingo/gi, dossier.slate.window)
      .replace(/el fin de semana/gi, dossier.slate.window)
      .replace(/fin de semana/gi, dossier.slate.window);
  }
  return text;
}

function applyAi(
  take: JornadaTake,
  jornada: JornadaOverview,
  dossier: TomaDossier,
  ai: AiJson | null
): JornadaTake {
  const fallbackBody = templateBody(dossier);
  const fallbackCites = templateCites(dossier);
  if (!ai) {
    return {
      ...take,
      body: fallbackBody,
      cites: fallbackCites,
      source: 'template',
      beats: overlayBeats(take.beats, jornada, dossier, undefined),
    };
  }
  const body = sanitizeBody(ai.body).map((p) =>
    patchWindowCopy(scrubFalseMath(p, dossier), dossier)
  );
  const headline =
    typeof ai.headline === 'string' && ai.headline.trim().length >= 8
      ? clip(patchWindowCopy(ai.headline, dossier), 72)
      : take.headline;
  const dek =
    typeof ai.dek === 'string' && ai.dek.trim().length >= 16
      ? clip(patchWindowCopy(scrubFalseMath(ai.dek, dossier), dossier), 220)
      : take.dek;
  return {
    ...take,
    headline,
    dek,
    body: body.length >= 2 ? body : fallbackBody,
    cites: fallbackCites,
    source: body.length >= 2 ? 'anthropic' : 'template',
    beats: overlayBeats(take.beats, jornada, dossier, ai.beats).map((b) => ({
      ...b,
      line: scrubFalseMath(b.line, dossier) || b.line,
    })),
  };
}

async function composeTake(
  jornada: JornadaOverview,
  opts: { skipAi: boolean }
): Promise<JornadaTake | null> {
  const take = buildJornadaTake(jornada);
  if (!take) return null;

  const [storiesPayload, tablaRaw] = await Promise.all([
    aggregateStories().catch(() => ({ stories: [] as Story[] })),
    sportmonksEnabled() ? fetchLigaMxStandings().catch(() => null) : Promise.resolve(null),
  ]);

  const dossier = buildDossier(jornada, storiesPayload.stories, tablaRaw?.entries);
  if (opts.skipAi) {
    return applyAi(take, jornada, dossier, null);
  }
  const ai = await generateTake(dossier);
  return applyAi(take, jornada, dossier, ai);
}

/** Cached jornada column. One take for the whole board — not per LOCK club. */
export async function getJornadaTakePayload(opts?: {
  skipAi?: boolean;
}): Promise<JornadaTake | null> {
  const jornada = await getJornadaOverview().catch(() => null);
  if (!jornada) return null;
  const { key, ttlMs } = tomaCacheKey(jornada);
  if (opts?.skipAi) {
    const hit = getCache<JornadaTake>(key, ttlMs);
    if (hit) return hit;
    return composeTake(jornada, { skipAi: true });
  }
  return singleFlight(key, ttlMs, () => composeTake(jornada, { skipAi: false }));
}
