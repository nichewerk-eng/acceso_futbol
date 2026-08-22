import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { mexicoDayKey } from '@/lib/radio/phases';
import { setAudio } from '@/lib/radio/cache';
import { clipShareText, parseTomaEpisodeId } from '@/lib/share/recordingShare';
import { kvGetJson, kvSetJson, kvSetNx, sharedKvEnabled } from '@/lib/sharedKv';
import type { JornadaOverview } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports/types';

export type TomaShowKind = 'antes' | 'dia' | 'cierre';

export const EPISODE_ANTES = 'antes';
export const EPISODE_CIERRE = 'cierre';

/** Bump when the Toma voice or delivery changes so stored episodes regenerate. */
export const TOMA_VOICE_REV = 'v5-eleven-narrator';

export type TomaEpisode = {
  id: string;
  jornadaNum: number;
  dayKey: string;
  kind?: TomaShowKind;
  title: string;
  transcript: string;
  sourceHash: string;
  audioUrl: string;
  blobPath?: string;
  contentType: string;
  generatedAt: string;
};

const EPISODE_TTL_MS = 21 * 24 * 60 * 60_000;
const LOCK_MS = 4 * 60_000;
const SETTLE_MS = 100 * 60_000;

const mem = new Map<string, TomaEpisode>();
const inflight = new Map<string, Promise<TomaEpisode | null>>();
const LOCAL_DIR = path.join(process.cwd(), '.toma-local');

function localSafeId(id: string): string | null {
  if (!id.startsWith('toma-ep-') || id.includes('/') || id.includes('..')) return null;
  return id;
}

function localMetaPath(id: string): string {
  return path.join(LOCAL_DIR, `${id}.json`);
}

function localAudioPath(id: string, contentType: string): string {
  const ext = contentType.includes('mpeg') ? 'mp3' : 'wav';
  return path.join(LOCAL_DIR, `${id}.${ext}`);
}

export async function saveLocalEpisode(ep: TomaEpisode, bytes: Buffer): Promise<void> {
  const id = localSafeId(ep.id);
  if (!id) return;
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(localMetaPath(id), JSON.stringify(ep));
  await writeFile(localAudioPath(id, ep.contentType), bytes);
}

export async function loadLocalAudio(
  id: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const safe = localSafeId(id);
  if (!safe) return null;
  for (const contentType of ['audio/wav', 'audio/mpeg'] as const) {
    try {
      const bytes = await readFile(localAudioPath(safe, contentType));
      if (bytes.length > 0) return { bytes, contentType };
    } catch {
      /* try next */
    }
  }
  return null;
}

async function loadLocalEpisode(key: string): Promise<TomaEpisode | null> {
  const id = localSafeId(key);
  if (!id) return null;
  try {
    const ep = JSON.parse(await readFile(localMetaPath(id), 'utf8')) as TomaEpisode;
    const audio = await loadLocalAudio(id);
    if (!ep?.audioUrl || !audio) return null;
    setAudio(id, audio.bytes, audio.contentType);
    mem.set(key, ep);
    return ep;
  } catch {
    return null;
  }
}

export function episodeStoreKey(jornadaNum: number, dayKey: string): string {
  return `toma-ep-j${jornadaNum}-${dayKey}`;
}

export function showKindFromDayKey(dayKey: string): TomaShowKind {
  if (dayKey === EPISODE_ANTES) return 'antes';
  if (dayKey === EPISODE_CIERRE) return 'cierre';
  return 'dia';
}

function jornadaRows(jornada: JornadaOverview): Fixture[] {
  return [...jornada.live, ...jornada.played, ...jornada.upcoming];
}

export function episodeBlobPath(id: string, contentType = 'audio/wav'): string {
  const ext = contentType.includes('mpeg') ? 'mp3' : 'wav';
  return `toma/${id}.${ext}`;
}

export function episodeLockKey(storeKey: string): string {
  return `${storeKey}-lock`;
}

function fixturesByMexicoDay(jornada: JornadaOverview): Map<string, Fixture[]> {
  const byDay = new Map<string, Fixture[]>();
  for (const f of jornadaRows(jornada)) {
    const t = +new Date(f.date);
    if (!Number.isFinite(t)) continue;
    const dayKey = mexicoDayKey(new Date(t));
    const list = byDay.get(dayKey) ?? [];
    list.push(f);
    byDay.set(dayKey, list);
  }
  return byDay;
}

function dayIsSettled(fixtures: Fixture[], now: number): boolean {
  if (fixtures.length === 0) return false;
  if (fixtures.some((f) => f.state === 'pre' || f.state === 'in')) return false;
  const lastKick = Math.max(...fixtures.map((f) => +new Date(f.date)));
  return Number.isFinite(lastKick) && now >= lastKick + SETTLE_MS;
}

/**
 * Settled jornada days on or before today, oldest first.
 * Viernes still counts on sábado morning — we do not require the day to be "today".
 */
export function closedDaySlates(
  jornada: JornadaOverview,
  now = Date.now()
): { dayKey: string; fixtures: Fixture[] }[] {
  const todayKey = mexicoDayKey(new Date(now));
  const byDay = fixturesByMexicoDay(jornada);
  return [...byDay.keys()]
    .filter((dayKey) => dayKey <= todayKey)
    .sort()
    .filter((dayKey) => dayIsSettled(byDay.get(dayKey)!, now))
    .map((dayKey) => ({ dayKey, fixtures: byDay.get(dayKey)! }));
}

/** Latest settled slate (today or an earlier day in this fecha). */
export function closedDaySlate(
  jornada: JornadaOverview,
  now = Date.now()
): { dayKey: string; fixtures: Fixture[] } | null {
  const days = closedDaySlates(jornada, now);
  return days[days.length - 1] ?? null;
}

/** Smoke-test / desk override: today's key, sealed scores only. */
export function forceDaySlate(
  jornada: JornadaOverview,
  now = Date.now()
): { dayKey: string; fixtures: Fixture[] } {
  return {
    dayKey: mexicoDayKey(new Date(now)),
    fixtures: jornada.played,
  };
}

/** Whole fecha still upcoming, first kick not yet. */
export function preJornadaSlate(
  jornada: JornadaOverview,
  now = Date.now()
): { dayKey: string; fixtures: Fixture[] } | null {
  const all = jornadaRows(jornada);
  if (all.length === 0) return null;
  if (jornada.live.length > 0 || jornada.played.length > 0) return null;
  if (all.some((f) => f.state === 'in' || f.state === 'post')) return null;
  const firstKick = Math.min(...all.map((f) => +new Date(f.date)));
  if (!Number.isFinite(firstKick) || now >= firstKick) return null;
  return { dayKey: EPISODE_ANTES, fixtures: [] };
}

/** Every game in the fecha is FT and settled. */
export function closedJornadaSlate(
  jornada: JornadaOverview,
  now = Date.now()
): { dayKey: string; fixtures: Fixture[] } | null {
  const all = jornadaRows(jornada);
  if (all.length === 0 || jornada.played.length === 0) return null;
  if (all.some((f) => f.state === 'pre' || f.state === 'in')) return null;
  const lastKick = Math.max(...all.map((f) => +new Date(f.date)));
  if (!Number.isFinite(lastKick) || now < lastKick + SETTLE_MS) return null;
  return { dayKey: EPISODE_CIERRE, fixtures: jornada.played };
}

export type TomaEpisodeCut = {
  id: string;
  jornadaNum: number;
  dayKey: string;
  kind: TomaShowKind;
  title: string;
  cue: string;
  audioUrl: string;
  generatedAt: string;
  label: string;
  shareText: string;
};

const WEEKDAYS_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

function mexicoWeekday(dayKey: string): (typeof WEEKDAYS_ES)[number] | null {
  const [y, m, d] = dayKey.split('-').map(Number);
  if (!y || !m || !d) return null;
  return WEEKDAYS_ES[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()] ?? null;
}

export function episodeDeskLabel(ep: Pick<TomaEpisode, 'dayKey' | 'kind'>): string {
  const kind = ep.kind ?? showKindFromDayKey(ep.dayKey);
  if (kind === 'antes') return 'Antes';
  if (kind === 'cierre') return 'Cierre';
  const [y, m, d] = ep.dayKey.split('-').map(Number);
  if (!y || !m || !d) return ep.dayKey;
  const dt = new Date(Date.UTC(y, m - 1, d, 18));
  const weekday = dt
    .toLocaleDateString('es-MX', { weekday: 'short', timeZone: 'UTC' })
    .replace('.', '');
  const rest = dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${weekday} ${rest}`;
}

/** Desk hook + what the cut actually is. Derived from kind so old files get unique titles. */
export function episodeShowCopy(
  ep: Pick<TomaEpisode, 'jornadaNum' | 'dayKey' | 'kind'>
): { title: string; cue: string } {
  const n = ep.jornadaNum;
  const kind = ep.kind ?? showKindFromDayKey(ep.dayKey);
  if (kind === 'antes') {
    return {
      title: 'La mesa está puesta',
      cue: `Previa de la J${n}. Quién llega caliente, qué se juega. Cero marcadores.`,
    };
  }
  if (kind === 'cierre') {
    return {
      title: 'Se apagó la fecha',
      cue: `Crónica de toda la J${n}. Tabla, corte 8º y la toma.`,
    };
  }
  const day = mexicoWeekday(ep.dayKey);
  if (day === 'sábado') {
    return {
      title: 'El sábado ya cantó',
      cue: 'Cierre del sábado. Lo sellado, la tabla y la pregunta que divide.',
    };
  }
  if (day === 'domingo') {
    return {
      title: 'Domingo de cuentas',
      cue: 'El domingo no perdona. Quién entra al 8 y quién se cae.',
    };
  }
  if (day === 'lunes') {
    return {
      title: 'Coletazo del lunes',
      cue: 'El último silbatazo de la fecha. Lo que cerró el lunes.',
    };
  }
  if (day === 'viernes') {
    return {
      title: 'Viernes de primera sangre',
      cue: 'Arranque de fecha. Lo que ya quedó en el marcador.',
    };
  }
  return {
    title: day ? `Lo que dejó el ${day}` : `Cierre del día · J${n}`,
    cue: 'Marcadores sellados del día, tabla y la toma.',
  };
}

export function toEpisodeCut(ep: TomaEpisode): TomaEpisodeCut {
  const show = episodeShowCopy(ep);
  return {
    id: ep.id,
    jornadaNum: ep.jornadaNum,
    dayKey: ep.dayKey,
    kind: ep.kind ?? showKindFromDayKey(ep.dayKey),
    title: show.title,
    cue: show.cue,
    audioUrl: ep.audioUrl,
    generatedAt: ep.generatedAt,
    label: episodeDeskLabel(ep),
    shareText: clipShareText(ep.transcript) || show.cue,
  };
}

function jornadaEpisodeDayKeys(jornada: JornadaOverview, now = Date.now()): string[] {
  const days = new Set<string>([EPISODE_ANTES, mexicoDayKey(new Date(now)), EPISODE_CIERRE]);
  for (const f of jornadaRows(jornada)) {
    const t = +new Date(f.date);
    if (Number.isFinite(t)) days.add(mexicoDayKey(new Date(t)));
  }
  return [...days];
}

function episodeRank(dayKey: string): [number, string] {
  if (dayKey === EPISODE_ANTES) return [0, ''];
  if (dayKey === EPISODE_CIERRE) return [2, ''];
  return [1, dayKey];
}

/** Every stored cut for this fecha. Next jornada replaces the set. */
export async function listJornadaEpisodes(
  jornada: JornadaOverview,
  now = Date.now()
): Promise<TomaEpisode[]> {
  const found = await Promise.all(
    jornadaEpisodeDayKeys(jornada, now).map((k) => getStoredEpisode(jornada.number, k))
  );
  const byId = new Map<string, TomaEpisode>();
  for (const ep of found) {
    if (ep?.audioUrl) byId.set(ep.id, ep);
  }
  return [...byId.values()].sort((a, b) => {
    const [ra, ka] = episodeRank(a.dayKey);
    const [rb, kb] = episodeRank(b.dayKey);
    if (ra !== rb) return ra - rb;
    return ka.localeCompare(kb);
  });
}

/** Newest cut on this fecha (cierre, else latest day, else antes). */
export async function pickPlayableEpisode(
  jornada: JornadaOverview,
  now = Date.now()
): Promise<TomaEpisode | null> {
  const list = await listJornadaEpisodes(jornada, now);
  return list[list.length - 1] ?? null;
}

export async function getStoredEpisode(
  jornadaNum: number,
  dayKey: string
): Promise<TomaEpisode | null> {
  const key = episodeStoreKey(jornadaNum, dayKey);
  const local = mem.get(key);
  if (local) return local;
  const hit = await kvGetJson<TomaEpisode>(key);
  if (hit?.data?.audioUrl) {
    mem.set(key, hit.data);
    return hit.data;
  }
  if (process.env.NODE_ENV === 'development') {
    return loadLocalEpisode(key);
  }
  return null;
}

export async function getStoredEpisodeById(id: string): Promise<TomaEpisode | null> {
  const parsed = parseTomaEpisodeId(id);
  if (!parsed) return null;
  return getStoredEpisode(parsed.jornadaNum, parsed.dayKey);
}

export async function putStoredEpisode(
  ep: TomaEpisode,
  opts?: { localOnly?: boolean }
): Promise<void> {
  const key = episodeStoreKey(ep.jornadaNum, ep.dayKey);
  mem.set(key, ep);
  if (!opts?.localOnly) await kvSetJson(key, ep, EPISODE_TTL_MS);
}

export async function tryEpisodeLock(
  storeKey: string,
  opts?: { localOnly?: boolean }
): Promise<boolean> {
  if (!opts?.localOnly && sharedKvEnabled()) {
    return kvSetNx(episodeLockKey(storeKey), '1', LOCK_MS);
  }
  return true;
}

export function trackInflight(
  storeKey: string,
  work: Promise<TomaEpisode | null>
): Promise<TomaEpisode | null> {
  inflight.set(storeKey, work);
  return work.finally(() => {
    inflight.delete(storeKey);
  });
}

export function inflightEpisode(storeKey: string): Promise<TomaEpisode | null> | undefined {
  return inflight.get(storeKey);
}
