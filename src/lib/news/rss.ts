export type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  image?: string;
};

function stripCdata(s: string) {
  return s.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, '$1').trim();
}

function stripTags(s: string) {
  return stripCdata(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string): string {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i');
  const m = block.match(re);
  return m ? stripCdata(m[1].trim()) : '';
}

function mediaUrl(block: string): string | undefined {
  const m =
    block.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
    block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) ||
    block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i);
  return m?.[1];
}

export function parseRss(xml: string): RssItem[] {
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  const out: RssItem[] = [];
  for (const m of blocks) {
    const block = m[1];
    const title = stripTags(tag(block, 'title'));
    const link = stripTags(tag(block, 'link')) || stripTags(tag(block, 'guid'));
    const description = stripTags(tag(block, 'description')).slice(0, 280);
    const pubDate = stripTags(tag(block, 'pubDate')) || null;
    if (!title || !link) continue;
    out.push({
      title,
      link,
      description,
      pubDate,
      image: mediaUrl(block),
    });
  }
  return out;
}

export async function fetchRss(url: string): Promise<RssItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AccesoFutbol/1.0 (+https://accesofutbol.com)' },
      signal: controller.signal,
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
