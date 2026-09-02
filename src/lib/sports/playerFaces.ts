import { singleFlight } from '@/lib/apiCache';
import { clubIdentityFromAbbr } from '@/config/clubIdentity';

const FACE_TTL_MS = 7 * 24 * 60 * 60_000;
const FOTMOB_TIMEOUT_MS = 5_000;

const NAME_PARTICLES = new Set([
  'de',
  'del',
  'la',
  'las',
  'los',
  'y',
  'da',
  'do',
  'dos',
  'van',
  'von',
  'jr',
  'ii',
  'iii',
]);

const TEAM_GENERIC = new Set([
  'club',
  'cf',
  'fc',
  'cd',
  'ud',
  'afc',
  'sc',
  'deportivo',
  'atletico',
  'futbol',
  'soccer',
]);

export type FacePlayer = {
  id: string;
  name: string;
  teamAbbr: string;
  photo?: string;
};

export type FotmobSuggestHit = {
  id: string;
  name: string;
  teamName: string;
  isCoach?: boolean;
};

export function usablePlayerPhoto(path?: string | null): string | undefined {
  if (!path) return undefined;
  const url = path.replace(/^http:\/\//, 'https://');
  if (/placeholder/i.test(url)) return undefined;
  return url;
}

export function foldName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function nameTokens(raw: string, keepParticles = false): string[] {
  return foldName(raw)
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => keepParticles || !NAME_PARTICLES.has(t));
}

export function searchTermsForPlayer(name: string): string[] {
  const trimmed = name.trim();
  const toks = nameTokens(trimmed);
  const terms: string[] = [];
  const push = (s: string) => {
    if (s && !terms.some((t) => foldName(t) === foldName(s))) terms.push(s);
  };
  push(trimmed);
  if (toks.length >= 2) push(`${titleish(toks[0])} ${titleish(toks[toks.length - 1])}`);
  if (toks[0] && toks[0].length >= 5) push(titleish(toks[0]));
  return terms;
}

function titleish(tok: string): string {
  return tok.charAt(0).toUpperCase() + tok.slice(1);
}

function teamNickNeedles(abbr: string): string[] {
  const club = clubIdentityFromAbbr(abbr);
  if (!club) return [];
  return [club.name, club.abbreviation, ...club.nicknames].map(foldName).filter((s) => s.length >= 3);
}

export function teamMatchesHit(teamName: string, teamAbbr: string): boolean {
  const hay = foldName(teamName);
  if (!hay) return false;
  return teamNickNeedles(teamAbbr).some((n) => n.length >= 4 && hay.includes(n));
}

export function scoreFotmobHit(hit: FotmobSuggestHit, name: string, teamAbbr: string): number {
  if (hit.isCoach) return -1;
  const want = nameTokens(name);
  const got = nameTokens(hit.name);
  if (!want.length || !got.length) return 0;
  const first = want[0];
  const last = want[want.length - 1];
  let s = 0;
  if (foldName(hit.name) === foldName(name)) s += 8;
  if (first && got[0] === first) s += 3;
  if (last && got[got.length - 1] === last) s += 4;
  const overlap = want.filter((t) => got.includes(t)).length;
  s += overlap;
  if (teamMatchesHit(hit.teamName, teamAbbr)) s += 6;
  else s -= 4;
  const club = clubIdentityFromAbbr(teamAbbr);
  const allowed = new Set(teamNickNeedles(teamAbbr));
  const extra = nameTokens(hit.teamName, true).filter(
    (t) => t.length >= 4 && !TEAM_GENERIC.has(t) && !allowed.has(t) && !(club && foldName(club.name).includes(t))
  );
  s -= extra.length;
  return s;
}

export function pickFotmobPlayer(
  hits: FotmobSuggestHit[],
  name: string,
  teamAbbr: string
): FotmobSuggestHit | null {
  const ranked = hits
    .map((hit) => ({ hit, score: scoreFotmobHit(hit, name, teamAbbr) }))
    .filter((x) => x.score >= 8 && teamMatchesHit(x.hit.teamName, teamAbbr))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.hit ?? null;
}

export function fotmobPlayerImageUrl(id: string): string {
  return `https://images.fotmob.com/image_resources/playerimages/${id}.png`;
}

type FaceCache = { url: string | null };

function parseFotmobHits(raw: unknown): FotmobSuggestHit[] {
  const blocks =
    raw && typeof raw === 'object' && 'squadMemberSuggest' in raw
      ? ((raw as { squadMemberSuggest?: unknown }).squadMemberSuggest as unknown[])
      : [];
  const hits: FotmobSuggestHit[] = [];
  for (const block of Array.isArray(blocks) ? blocks : []) {
    const options =
      block && typeof block === 'object' && 'options' in block
        ? ((block as { options?: unknown }).options as unknown[])
        : [];
    for (const opt of Array.isArray(options) ? options : []) {
      if (!opt || typeof opt !== 'object') continue;
      const row = opt as {
        text?: string;
        payload?: { id?: string | number; teamName?: string; isCoach?: boolean };
      };
      const payload = row.payload ?? {};
      const id = String(payload.id ?? '').trim();
      const fromText = String(row.text ?? '').split('|')[0]?.trim() ?? '';
      if (!id || !fromText) continue;
      hits.push({
        id,
        name: fromText,
        teamName: String(payload.teamName ?? ''),
        isCoach: Boolean(payload.isCoach),
      });
    }
  }
  return hits;
}

async function fotmobSuggest(term: string): Promise<FotmobSuggestHit[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FOTMOB_TIMEOUT_MS);
  try {
    const url = `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(term)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AccesoFutbol/1.0; +https://www.accesofutbol.com)',
      },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return [];
    return parseFotmobHits(await res.json());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function resolveFotmobPhoto(name: string, teamAbbr: string): Promise<string | undefined> {
  for (const term of searchTermsForPlayer(name)) {
    const hits = await fotmobSuggest(term);
    const picked = pickFotmobPlayer(hits, name, teamAbbr);
    if (picked) return fotmobPlayerImageUrl(picked.id);
  }
  return undefined;
}

async function photoFor(player: FacePlayer): Promise<string | undefined> {
  const known = usablePlayerPhoto(player.photo);
  if (known) return known;
  const packed = await singleFlight(`player-face-v1-${player.id}`, FACE_TTL_MS, async () => {
    const url = (await resolveFotmobPhoto(player.name, player.teamAbbr)) ?? null;
    return { url } satisfies FaceCache;
  });
  return packed.url ?? undefined;
}

/** Fill Sportmonks gaps with FotMob headshots so the Once always has faces. */
export async function fillMissingPlayerPhotos<T extends FacePlayer>(players: T[]): Promise<T[]> {
  const next = await Promise.all(
    players.map(async (p) => {
      if (usablePlayerPhoto(p.photo)) return p;
      const photo = await photoFor(p);
      return photo ? { ...p, photo } : p;
    })
  );
  return next;
}
