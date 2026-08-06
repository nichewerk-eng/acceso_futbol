import { espnFetch, SLUG } from '@/lib/espn';
import type { Story } from './types';

type EspnArticle = {
  id?: number | string;
  headline?: string;
  description?: string;
  published?: string;
  lastModified?: string;
  images?: { url?: string }[];
  links?: { web?: { href?: string } };
};

export async function fetchEspnLigaMxNews(): Promise<Story[]> {
  try {
    // Prefer site.web.api — site.api is often 403'd from serverless/edge IPs.
    const raw = (await espnFetch(
      `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${SLUG.LIGA_MX}/news?lang=es&limit=20`
    )) as { articles?: EspnArticle[] };

    const stories: Story[] = [];
    for (const a of raw.articles ?? []) {
      const title = a.headline?.trim() ?? '';
      const summary = a.description?.trim() ?? '';
      const url = a.links?.web?.href ?? '';
      if (!title || !url) continue;
      stories.push({
        id: `espn-${a.id ?? title.slice(0, 24)}`,
        title,
        summary,
        url,
        sourceId: 'espn',
        sourceLabel: 'ESPN',
        publishedAt: a.published ?? a.lastModified ?? null,
        image: a.images?.[0]?.url,
      });
    }
    return stories;
  } catch {
    return [];
  }
}
