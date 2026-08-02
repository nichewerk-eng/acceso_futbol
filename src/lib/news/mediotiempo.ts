import { extractListingLinks, fetchText } from './html';
import type { Story } from './types';

const NEWS_SITEMAP =
  'https://www.mediotiempo.com/sitemap/google-news/sitemap-google-news-current-1.xml';
const LISTING = 'https://www.mediotiempo.com/futbol/liga-mx';

function fromNewsSitemap(xml: string): Story[] {
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)];
  const stories: Story[] = [];

  for (const m of blocks) {
    const block = m[1];
    const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim();
    const title = block.match(/<news:title>([^<]+)<\/news:title>/i)?.[1]?.trim();
    const date = block.match(/<news:publication_date>([^<]+)<\/news:publication_date>/i)?.[1]?.trim();
    if (!loc || !title) continue;
    if (!/\/futbol\/liga-mx\//i.test(loc) && !/\/liga-mx-femenil\//i.test(loc)) continue;

    stories.push({
      id: `mediotiempo-${loc.replace(/[^a-zA-Z0-9]/g, '').slice(-28)}`,
      title,
      summary: '',
      url: loc,
      sourceId: 'mediotiempo',
      sourceLabel: 'Mediotiempo',
      publishedAt: date ? new Date(date).toISOString() : null,
    });
  }

  stories.sort((a, b) => {
    const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
    const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
    return bt - at;
  });

  return stories.slice(0, 20);
}

function fromListingHtml(html: string): Story[] {
  return extractListingLinks(html, {
    host: 'www.mediotiempo.com',
    pathIncludes: '/futbol/liga-mx/',
  })
    .slice(0, 16)
    .map((item) => ({
      id: `mediotiempo-${item.url.replace(/[^a-zA-Z0-9]/g, '').slice(-28)}`,
      title: item.title,
      summary: '',
      url: item.url,
      sourceId: 'mediotiempo' as const,
      sourceLabel: 'Mediotiempo',
      publishedAt: null,
    }));
}

export async function fetchMediotiempoStories(): Promise<Story[]> {
  const xml = await fetchText(NEWS_SITEMAP, 180);
  if (xml) {
    const fromSm = fromNewsSitemap(xml);
    if (fromSm.length > 0) return fromSm;
  }

  const html = await fetchText(LISTING, 180);
  if (!html) return [];
  return fromListingHtml(html);
}
