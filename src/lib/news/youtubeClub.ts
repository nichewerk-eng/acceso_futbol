import { getCache, setCache, singleFlight } from '@/lib/apiCache';
import type { ClubIdentity } from '@/config/clubIdentity';

export type YoutubeClip = {
  id: string;
  title: string;
  url: string;
  videoId: string;
  publishedAt: string | null;
  image?: string;
};

const TTL_MS = 15 * 60_000;

function stripTags(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse YouTube Atom search / channel feeds. */
function parseAtomVideos(xml: string): YoutubeClip[] {
  const blocks = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
  const out: YoutubeClip[] = [];
  for (const m of blocks) {
    const block = m[1];
    const videoId =
      block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1] ??
      block.match(/videoId[=:]["']?([a-zA-Z0-9_-]{6,})/)?.[1];
    const title = stripTags(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    const published =
      block.match(/<published>([^<]+)<\/published>/i)?.[1] ??
      block.match(/<updated>([^<]+)<\/updated>/i)?.[1] ??
      null;
    if (!videoId || !title) continue;
    out.push({
      id: `yt-${videoId}`,
      title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      publishedAt: published ? new Date(published).toISOString() : null,
      image: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    });
  }
  return out;
}

/** Public YouTube search Atom — best-effort, may be empty. */
export async function fetchClubYoutube(
  club: ClubIdentity,
  limit = 4
): Promise<YoutubeClip[]> {
  const key = `yt-club-v1-${club.id}`;
  const cached = getCache<YoutubeClip[]>(key, TTL_MS);
  if (cached) return cached.slice(0, limit);

  return singleFlight(key, TTL_MS, async () => {
    const q = encodeURIComponent(`${club.name} Liga MX`);
    const url = `https://www.youtube.com/feeds/videos.xml?search_query=${q}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/atom+xml, application/xml, text/xml' },
        next: { revalidate: 900 },
      });
      if (!res.ok) {
        setCache(key, []);
        return [];
      }
      const xml = await res.text();
      const clips = parseAtomVideos(xml)
        .filter((c) => club.matchHints.test(c.title))
        .slice(0, limit);
      setCache(key, clips);
      return clips;
    } catch {
      setCache(key, []);
      return [];
    } finally {
      clearTimeout(timer);
    }
  });
}
