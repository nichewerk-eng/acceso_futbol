import { getClubIdentity } from '@/config/clubIdentity';
import { showClipsForClub } from '@/config/clubShow';
import { MOMENTS } from '@/config/moments';
import { aggregateStories } from '@/lib/news/aggregate';
import { filterFreshByPublishedAt, isFreshNewsDay } from '@/lib/news/freshness';
import { fetchClubRedditHeat, type RedditHeatItem } from '@/lib/news/reddit';
import { fetchClubYoutube, type YoutubeClip } from '@/lib/news/youtubeClub';
import type { Story } from '@/lib/news/types';

export type ClubPulseKind = 'story' | 'reddit' | 'moment' | 'youtube' | 'tiktok' | 'blog';

export type ClubPulseItem = {
  id: string;
  kind: ClubPulseKind;
  stamp: string;
  title: string;
  summary?: string;
  url: string;
  sourceLabel: string;
  publishedAt: string | null;
  image?: string;
  score?: number;
  accesoLine?: string;
  videoId?: string;
};

export type ClubPulsePayload = {
  clubId: string;
  generatedAt: string;
  items: ClubPulseItem[];
};

function storyToItem(s: Story): ClubPulseItem {
  return {
    id: s.id,
    kind: 'story',
    stamp: 'AF://CABLE',
    title: s.title,
    summary: s.summary,
    url: s.url,
    sourceLabel: s.sourceLabel,
    publishedAt: s.publishedAt,
    image: s.image,
    accesoLine: s.accesoLine,
  };
}

function redditToItem(r: RedditHeatItem): ClubPulseItem {
  return {
    id: r.id,
    kind: 'reddit',
    stamp: 'AF://REDDIT',
    title: r.title,
    url: r.url,
    sourceLabel: `r/${r.subreddit}`,
    publishedAt: r.publishedAt,
    score: r.score,
    summary: `${r.score} pts · ${r.comments} comentarios`,
  };
}

function ytToItem(y: YoutubeClip): ClubPulseItem {
  return {
    id: y.id,
    kind: 'youtube',
    stamp: 'AF://SHOW',
    title: y.title,
    url: y.url,
    sourceLabel: 'YouTube',
    publishedAt: y.publishedAt,
    image: y.image,
    videoId: y.videoId,
  };
}

/** Round-robin Cable / Reddit / Show so one source never owns the wall. */
function interleave(buckets: ClubPulseItem[][], limit: number): ClubPulseItem[] {
  const queues = buckets.map((b) => [...b]).filter((q) => q.length > 0);
  const seen = new Set<string>();
  const out: ClubPulseItem[] = [];
  while (out.length < limit && queues.some((q) => q.length)) {
    for (const q of queues) {
      while (q.length) {
        const next = q.shift()!;
        const key = next.title.toLowerCase().slice(0, 48);
        if (seen.has(key) || seen.has(next.id)) continue;
        seen.add(key);
        seen.add(next.id);
        out.push(next);
        break;
      }
      if (out.length >= limit) break;
    }
  }
  return out;
}

export async function getClubPulse(slug: string): Promise<ClubPulsePayload | null> {
  const club = getClubIdentity(slug);
  if (!club) return null;

  const [storiesPayload, reddit, youtube] = await Promise.all([
    aggregateStories().catch(() => ({ stories: [] as Story[], generatedAt: '' })),
    fetchClubRedditHeat(club, 10),
    fetchClubYoutube(club, 4),
  ]);

  const cable = storiesPayload.stories
    .filter((s) => club.matchHints.test(`${s.title} ${s.summary ?? ''}`))
    .filter((s) => isFreshNewsDay(s.publishedAt))
    .slice(0, 14)
    .map(storyToItem);

  const moments: ClubPulseItem[] = MOMENTS.filter(
    (m) => m.clubIds?.includes(club.id) && isFreshNewsDay(m.publishedAt)
  ).map((m) => ({
    id: `moment-${m.id}`,
    kind: 'moment' as const,
    stamp: 'AF://ACCESO',
    title: m.headline,
    summary: m.body,
    url: m.href ?? `/momento/${m.id}`,
    sourceLabel: 'Acceso',
    publishedAt: m.publishedAt ?? null,
    image: m.image,
    accesoLine: m.accesoLine,
    videoId: m.videoId,
  }));

  const showSeeds: ClubPulseItem[] = showClipsForClub(club.id)
    .filter((c) => isFreshNewsDay(c.publishedAt))
    .map((c) => ({
      id: `show-${c.id}`,
      kind: c.kind === 'tiktok' ? 'tiktok' : c.kind === 'youtube' ? 'youtube' : 'blog',
      stamp: 'AF://SHOW',
      title: c.title,
      url: c.url,
      sourceLabel: c.kind === 'tiktok' ? 'TikTok' : c.kind === 'youtube' ? 'YouTube' : 'Acceso',
      publishedAt: c.publishedAt ?? null,
      videoId: c.videoId,
    }));

  const freshReddit = filterFreshByPublishedAt(reddit);
  const freshYt = filterFreshByPublishedAt(youtube);

  // Prefer Acceso moments near the top of show lane
  const showLane = [...moments, ...showSeeds, ...freshYt.map(ytToItem)];
  const items = interleave([cable, freshReddit.map(redditToItem), showLane], 28);

  // If filters wiped Cable, still surface Acceso weather via show lane
  if (items.length === 0 && showLane.length > 0) {
    return {
      clubId: club.id,
      generatedAt: new Date().toISOString(),
      items: showLane.slice(0, 12),
    };
  }

  return {
    clubId: club.id,
    generatedAt: new Date().toISOString(),
    items,
  };
}
