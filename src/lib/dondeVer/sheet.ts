/**
 * Liga MX "Dónde ver" master list from a Google Sheet.
 *
 * Tabs (share as "Anyone with the link · Viewer"):
 *   Partidos: Jornada | Local | Visita | MX 1–6 | US 1–6 | Nota
 *   Clubes:   Club | MX 1–6 | US 1–6   (home-club defaults)
 *   Canales:  Canal | Id | Tipo        (dropdown source; include "Ninguno")
 *
 * Each MX/US slot is one channel (dropdown). Old comma-lists still parse.
 * Empty slots → fall back to the code tables for that side.
 * "Ninguno" / "-" in every filled slot → explicitly no channels.
 *
 * Env: DONDE_VER_SHEET_ID overrides the public Acceso sheet. Set empty to use code tables only.
 */
import { peekCache, peekCacheAgeMs, setCache, singleFlight } from '@/lib/apiCache';
import { kvSetJson, sharedKvEnabled } from '@/lib/sharedKv';
import {
  setDondeVerOverlay,
  TV_CHANNELS,
  type DondeVerOverlay,
  type DondeVerSides,
  type TvChannelId,
} from '@/config/dondeVer';
import { APERTURA_2026_FIXTURES } from '@/fixtures/ligamx-apertura-2026';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';

const CACHE_KEY = 'donde-ver-sheet-v1';
/** Memory/KV coalesce; Next data cache adds up to `FETCH_REVALIDATE_S` on top. */
const TTL_MS = 30_000;
const FETCH_REVALIDATE_S = 30;
const FETCH_TIMEOUT_MS = 4_000;

export type DondeVerSheetSnapshot = DondeVerOverlay & {
  ok: boolean;
  fetchedAt: number;
  rows: { matches: number; clubs: number };
  errors: string[];
};

/** Public "Dónde ver" sheet (Anyone with the link). Override with DONDE_VER_SHEET_ID. */
const DEFAULT_SHEET_ID = '1mWIOStPapEc0vrnNWP8wQMoDuE1MxISfBqy64unzGJk';

export function dondeVerSheetId(): string | null {
  if (process.env.DONDE_VER_SHEET_ID !== undefined) {
    return process.env.DONDE_VER_SHEET_ID.trim() || null;
  }
  return DEFAULT_SHEET_ID;
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const CHANNEL_ALIASES: Record<string, TvChannelId> = {
  canal5: 'canal-5',
  azteca7: 'azteca-7',
  aztecasiete: 'azteca-7',
  foxone: 'fox-one',
  foxdeportes: 'fox-deportes',
  disneyplus: 'disney-plus',
  disney: 'disney-plus',
  prime: 'prime-video',
  amazonprime: 'prime-video',
  amazonprimevideo: 'prime-video',
  appletv: 'apple-tv',
  mlsseasonpass: 'apple-tv',
  vixplus: 'vix',
  layvtime: 'layvtime',
  claro: 'claro-sports',
  hbomax: 'max',
  imagen: 'imagen-tv',
  estrella: 'estrella-tv',
};

const CHANNEL_BY_TOKEN: Map<string, TvChannelId> = (() => {
  const m = new Map<string, TvChannelId>();
  for (const ch of Object.values(TV_CHANNELS)) {
    m.set(norm(ch.id), ch.id);
    m.set(norm(ch.label), ch.id);
  }
  for (const [k, v] of Object.entries(CHANNEL_ALIASES)) m.set(k, v);
  return m;
})();

const TEAM_ALIASES: Record<string, string> = {
  america: 'AME',
  aguilas: 'AME',
  atlas: 'ATS',
  rojinegros: 'ATS',
  zorros: 'ATS',
  atlante: 'ATL',
  potros: 'ATL',
  cruzazul: 'CAZ',
  lamaquina: 'CAZ',
  juarez: 'JUA',
  fcjuarez: 'JUA',
  bravos: 'JUA',
  guadalajara: 'GDL',
  chivas: 'GDL',
  leon: 'LEO',
  esmeraldas: 'LEO',
  monterrey: 'MTY',
  rayados: 'MTY',
  necaxa: 'NCX',
  rayos: 'NCX',
  pachuca: 'PAC',
  tuzos: 'PAC',
  puebla: 'PUE',
  franja: 'PUE',
  pumas: 'UNAM',
  pumasunam: 'UNAM',
  queretaro: 'QRO',
  gallos: 'QRO',
  gallosblancos: 'QRO',
  santos: 'SAN',
  santoslaguna: 'SAN',
  sanluis: 'ASL',
  atleticodesanluis: 'ASL',
  atleticosanluis: 'ASL',
  tigres: 'UANL',
  tigresuanl: 'UANL',
  tijuana: 'TIJ',
  xolos: 'TIJ',
  toluca: 'TOL',
  diablos: 'TOL',
  diablosrojos: 'TOL',
};

const CLUB_ABBRS = new Set(APERTURA_2026_FIXTURES.map((f) => f.home.abbreviation));

function teamAbbr(cell: string): string | null {
  const raw = cell.trim();
  if (!raw) return null;
  const abbr = scheduleAbbr(raw);
  if (CLUB_ABBRS.has(abbr)) return abbr;
  return TEAM_ALIASES[norm(raw)] ?? null;
}

function sortedPair(a: string, b: string): string {
  return [a, b].sort().join('|');
}

const PAIR_JORNADA: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const f of APERTURA_2026_FIXTURES) {
    const n = Number(f.jornada?.match(/(\d+)/)?.[1]);
    if (n) out[sortedPair(f.home.abbreviation, f.away.abbreviation)] = n;
  }
  return out;
})();

const NONE = new Set(['-', 'ninguno', 'ninguna', 'sintv', 'na', 'none']);

/** undefined = empty cell (fall back); [] = explicitly none. */
function channelList(cell: string | undefined, where: string, errors: string[]) {
  const raw = (cell ?? '').trim();
  if (!raw) return undefined;
  const tokens = raw.split(/[,;/\n·|]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return undefined;
  const kept = tokens.filter((t) => t !== '-' && !NONE.has(norm(t)));
  if (kept.length === 0) return [] as TvChannelId[];
  const ids: TvChannelId[] = [];
  for (const t of kept) {
    const id = CHANNEL_BY_TOKEN.get(norm(t));
    if (!id) {
      errors.push(`${where}: canal desconocido "${t}"`);
      continue;
    }
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** RFC 4180-ish: quoted fields, doubled quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim()));
}

/** Rows as objects keyed by normalized header (jornada, local, visita, mx, mx1, us, club…). */
function records(rows: string[][]): Record<string, string>[] {
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((h) => {
    const k = norm(h);
    if (k === 'casa' || k === 'home') return 'local';
    if (k === 'visitante' || k === 'away') return 'visita';
    if (k === 'equipo') return 'club';
    const mxSlot = k.match(/^(?:canales)?(?:mexico|mx)(\d*)$/);
    if (mxSlot) return mxSlot[1] ? `mx${mxSlot[1]}` : 'mx';
    const usSlot = k.match(/^(?:canales)?(?:usa|us|eeuu|eua)(\d*)$/);
    if (usSlot) return usSlot[1] ? `us${usSlot[1]}` : 'us';
    return k;
  });
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])));
}

/**
 * One comma-list (`MX`) or dummy-proof slots (`MX 1`…`MX 6`).
 * All-empty → fall through. Only "Ninguno"/`-` → explicitly no channels.
 */
function sideFromRow(r: Record<string, string>, side: 'mx' | 'us'): string | undefined {
  const keys = Object.keys(r)
    .filter((k) => k === side || new RegExp(`^${side}\\d+$`).test(k))
    .sort((a, b) => {
      const na = Number(a.slice(side.length) || 0);
      const nb = Number(b.slice(side.length) || 0);
      return na - nb;
    });
  if (keys.length === 0) return undefined;
  const tokens = keys.map((k) => (r[k] ?? '').trim()).filter(Boolean);
  if (tokens.length === 0) return undefined;
  return tokens.join(',');
}

export function buildSnapshot(partidosCsv: string, clubesCsv: string): DondeVerSheetSnapshot {
  const errors: string[] = [];
  const matches: Record<string, DondeVerSides> = {};
  const clubs: Record<string, DondeVerSides> = {};

  records(parseCsv(partidosCsv)).forEach((r, i) => {
    const where = `Partidos fila ${i + 2}`;
    const home = teamAbbr(r.local ?? '');
    const away = teamAbbr(r.visita ?? '');
    if (!home || !away) {
      if (r.local || r.visita) errors.push(`${where}: equipo desconocido "${r.local}" / "${r.visita}"`);
      return;
    }
    const pair = sortedPair(home, away);
    const n = Number(String(r.jornada ?? '').match(/(\d+)/)?.[1]) || PAIR_JORNADA[pair];
    if (!n) {
      errors.push(`${where}: falta jornada para ${home}-${away}`);
      return;
    }
    const mx = channelList(sideFromRow(r, 'mx'), `${where} MX`, errors);
    const us = channelList(sideFromRow(r, 'us'), `${where} US`, errors);
    if (mx === undefined && us === undefined) return;
    matches[`j${n}|${pair}`] = { mx, us };
  });

  records(parseCsv(clubesCsv)).forEach((r, i) => {
    const where = `Clubes fila ${i + 2}`;
    const club = teamAbbr(r.club ?? r.local ?? '');
    if (!club) {
      if (r.club) errors.push(`${where}: club desconocido "${r.club}"`);
      return;
    }
    const mx = channelList(sideFromRow(r, 'mx'), `${where} MX`, errors);
    const us = channelList(sideFromRow(r, 'us'), `${where} US`, errors);
    if (mx === undefined && us === undefined) return;
    clubs[club] = { mx, us };
  });

  return {
    ok: true,
    fetchedAt: Date.now(),
    matches,
    clubs,
    pairJornada: PAIR_JORNADA,
    rows: { matches: Object.keys(matches).length, clubs: Object.keys(clubs).length },
    errors,
  };
}

function tabUrl(sheetId: string, tab: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;
}

async function fetchTab(sheetId: string, tab: string, fresh = false): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(tabUrl(sheetId, tab), {
      signal: controller.signal,
      ...(fresh
        ? { cache: 'no-store' as const }
        : { next: { revalidate: FETCH_REVALIDATE_S } }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    // A private sheet answers with the Google sign-in HTML, not CSV.
    if (/^\s*<!doctype html|<html/i.test(text)) throw new Error('sheet not public');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function loadSnapshot(fresh = false): Promise<DondeVerSheetSnapshot | null> {
  const sheetId = dondeVerSheetId();
  if (!sheetId) return null;
  const prev = peekCache<DondeVerSheetSnapshot>(CACHE_KEY);
  try {
    const [partidos, clubes] = await Promise.all([
      fetchTab(sheetId, 'Partidos', fresh),
      fetchTab(sheetId, 'Clubes', fresh).catch(() => ''),
    ]);
    return buildSnapshot(partidos, clubes);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // Keep serving the last good list; never blank the channels on a Google hiccup.
    if (prev?.ok) return { ...prev, errors: [`fetch: ${reason}`, ...prev.errors.slice(0, 20)] };
    return {
      ok: false,
      fetchedAt: Date.now(),
      matches: {},
      clubs: {},
      pairJornada: PAIR_JORNADA,
      rows: { matches: 0, clubs: 0 },
      errors: [`fetch: ${reason}`],
    };
  }
}

function install(snap: DondeVerSheetSnapshot | null): void {
  setDondeVerOverlay(
    snap?.ok ? { matches: snap.matches, clubs: snap.clubs, pairJornada: snap.pairJornada } : null
  );
}

/**
 * Load (≤ every 30s, shared via KV) and install the sheet overlay. Await before
 * building anything that caches Liga MX channels. Never throws.
 */
export async function ensureDondeVerSheet(): Promise<DondeVerSheetSnapshot | null> {
  if (!dondeVerSheetId()) return null;
  try {
    const snap = await singleFlight(CACHE_KEY, TTL_MS, loadSnapshot);
    install(snap);
    return snap;
  } catch {
    return peekCache<DondeVerSheetSnapshot>(CACHE_KEY);
  }
}

/** Bypass caches (ops). */
export async function refreshDondeVerSheet(): Promise<DondeVerSheetSnapshot | null> {
  const snap = await loadSnapshot(true);
  if (snap) {
    setCache(CACHE_KEY, snap);
    if (sharedKvEnabled()) void kvSetJson(CACHE_KEY, snap, TTL_MS * 3);
  }
  install(snap);
  return snap;
}

export function dondeVerSheetStatus() {
  const snap = peekCache<DondeVerSheetSnapshot>(CACHE_KEY);
  const age = peekCacheAgeMs(CACHE_KEY);
  return { snap, ageMs: age };
}
