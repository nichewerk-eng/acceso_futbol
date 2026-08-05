import { getCache, setCache, singleFlight } from '@/lib/apiCache';
import type { ClubIdentity } from '@/config/clubIdentity';

export type RedditHeatItem = {
  id: string;
  title: string;
  url: string;
  subreddit: string;
  score: number;
  comments: number;
  publishedAt: string | null;
  author?: string;
};

/**
 * PullPush (api.pullpush.io) — free Pushshift-style archive.
 * Public reddit.com *.json returns 403; official OAuth needs approval.
 * Cache hard: volunteer infra, ~1k req/hr.
 */
const TTL_MS = 15 * 60_000;
const PULLPUSH = 'https://api.pullpush.io/reddit/search/submission/';

type PullPushPost = {
  id?: string;
  title?: string;
  permalink?: string;
  url?: string;
  subreddit?: string;
  score?: number;
  num_comments?: number;
  created_utc?: number;
  author?: string;
  stickied?: boolean;
  over_18?: boolean;
};

async function pullpushSearch(params: Record<string, string>): Promise<PullPushPost[]> {
  const qs = new URLSearchParams(params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${PULLPUSH}?${qs}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AccesoFutbol/1.0 (club-sala; +https://accesofutbol.com)',
      },
      next: { revalidate: 900 },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: PullPushPost[] };
    return Array.isArray(json.data) ? json.data : [];
  } finally {
    clearTimeout(timer);
  }
}

function mapPosts(posts: PullPushPost[]): RedditHeatItem[] {
  const out: RedditHeatItem[] = [];
  const seen = new Set<string>();
  for (const d of posts) {
    if (!d?.title || d.stickied || d.over_18) continue;
    const id = d.id ?? d.permalink ?? d.title;
    if (seen.has(id)) continue;
    seen.add(id);
    const permalink = d.permalink
      ? d.permalink.startsWith('http')
        ? d.permalink
        : `https://www.reddit.com${d.permalink}`
      : d.url;
    if (!permalink) continue;
    out.push({
      id: `reddit-${d.id ?? permalink.slice(-24)}`,
      title: d.title,
      url: permalink,
      subreddit: d.subreddit ?? 'LigaMX',
      score: Number(d.score ?? 0),
      comments: Number(d.num_comments ?? 0),
      publishedAt: d.created_utc
        ? new Date(d.created_utc * 1000).toISOString()
        : null,
      author: d.author,
    });
  }
  return out;
}

/** Prefer recent + engaged threads (archive may lag weeks/months). */
function rank(a: RedditHeatItem, b: RedditHeatItem) {
  const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
  const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
  const ageA = Math.max(0, Date.now() - at) / 86_400_000;
  const ageB = Math.max(0, Date.now() - bt) / 86_400_000;
  const heatA = a.score + a.comments * 2;
  const heatB = b.score + b.comments * 2;
  // Decay so fresher posts beat ancient viral ones
  const scoreA = heatA / (1 + ageA / 30);
  const scoreB = heatB / (1 + ageB / 30);
  return scoreB - scoreA;
}

/** Club heat from r/LigaMX via PullPush. */
export async function fetchClubRedditHeat(
  club: ClubIdentity,
  limit = 8
): Promise<RedditHeatItem[]> {
  const key = `reddit-pullpush-v2-${club.id}`;
  const cached = getCache<RedditHeatItem[]>(key, TTL_MS);
  if (cached) return cached.slice(0, limit);

  return singleFlight(key, TTL_MS, async () => {
    const q = club.name;
    try {
      const [byRecent, byScore, byNick] = await Promise.all([
        pullpushSearch({
          subreddit: 'LigaMX',
          q,
          size: '20',
          sort: 'desc',
          sort_type: 'created_utc',
        }),
        pullpushSearch({
          subreddit: 'LigaMX',
          q,
          size: '15',
          sort: 'desc',
          sort_type: 'score',
        }),
        club.nicknames[0]
          ? pullpushSearch({
              subreddit: 'LigaMX',
              q: club.nicknames[0],
              size: '12',
              sort: 'desc',
              sort_type: 'created_utc',
            })
          : Promise.resolve([] as PullPushPost[]),
      ]);

      let posts = [...byRecent, ...byScore, ...byNick];

      if (posts.length < 4) {
        const dump = await pullpushSearch({
          subreddit: 'LigaMX',
          size: '40',
          sort: 'desc',
          sort_type: 'created_utc',
        });
        posts = dump.filter((p) => club.matchHints.test(p.title ?? ''));
      }

      const mapped = mapPosts(posts).filter((item) =>
        club.matchHints.test(item.title)
      );
      const pool = mapped.length > 0 ? mapped : mapPosts(posts);
      const ranked = [...pool].sort(rank).slice(0, 12);

      setCache(key, ranked);
      return ranked.slice(0, limit);
    } catch {
      setCache(key, []);
      return [];
    }
  });
}
