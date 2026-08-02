import { extractListingLinks, fetchText } from './html';
import type { Story } from './types';

const LISTING = 'https://www.tudn.com/futbol/liga-mx';
/** Highest-index futbol sitemap tends to hold the newest URLs. */
const SITEMAP = 'https://www.tudn.com/sitemap_futbol_15.xml';

function slugTitle(url: string) {
  const slug = url.split('/').filter(Boolean).pop() ?? '';
  return slug
    .replace(/-video$/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function fromListingHtml(html: string): Story[] {
  return extractListingLinks(html, {
    host: 'www.tudn.com',
    pathIncludes: '/futbol/liga-mx/',
    minTitleLen: 24,
  })
    .slice(0, 18)
    .map((item) => ({
      id: `tudn-${item.url.replace(/[^a-zA-Z0-9]/g, '').slice(-28)}`,
      title: item.title,
      summary: '',
      url: item.url,
      sourceId: 'tudn' as const,
      sourceLabel: 'TUDN',
      publishedAt: null,
    }));
}

function fromSitemap(xml: string): Story[] {
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)];
  const rows: Story[] = [];

  for (const m of blocks) {
    const block = m[1];
    const loc = block.match(/<loc>(https:\/\/www\.tudn\.com\/futbol\/liga-mx\/[^<]+)<\/loc>/i)?.[1];
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1];
    if (!loc) continue;
    // Prefer editorial-looking slugs over bare fixture stubs when possible
    const slug = loc.split('/').pop() ?? '';
    if (/^liga-mx-ap-\d{4}/i.test(slug)) continue;

    rows.push({
      id: `tudn-${loc.replace(/[^a-zA-Z0-9]/g, '').slice(-28)}`,
      title: slugTitle(loc),
      summary: '',
      url: loc,
      sourceId: 'tudn',
      sourceLabel: 'TUDN',
      publishedAt: lastmod ? new Date(lastmod).toISOString() : null,
    });
  }

  rows.sort((a, b) => {
    const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
    const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
    return bt - at;
  });

  return rows.slice(0, 16);
}

export async function fetchTudnStories(): Promise<Story[]> {
  const html = await fetchText(LISTING, 180);
  if (html) {
    const fromPage = fromListingHtml(html);
    if (fromPage.length > 0) return fromPage;
  }

  const xml = await fetchText(SITEMAP, 300);
  if (!xml) return [];
  return fromSitemap(xml);
}
