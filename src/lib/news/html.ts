const UA =
  'Mozilla/5.0 (compatible; AccesoFutbol/1.0; +https://accesofutbol.com)';

export async function fetchText(url: string, revalidate = 180): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9',
      },
      signal: controller.signal,
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function stripTags(s: string) {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

/** Pull og:image (or twitter:image) from an article HTML page. */
export function extractOgImage(html: string): string | undefined {
  const patterns = [
    /property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
    /name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    const url = m?.[1]?.trim();
    if (url && /^https?:\/\//i.test(url)) return decodeEntities(url);
  }
  return undefined;
}

/** Attach og:image to the first N stories (parallel, best-effort). */
export async function enrichWithOgImages<T extends { url: string; image?: string }>(
  stories: T[],
  limit = 8
): Promise<T[]> {
  const targets = stories.slice(0, limit);
  await Promise.all(
    targets.map(async (story) => {
      if (story.image) return;
      const html = await fetchText(story.url, 300);
      if (!html) return;
      const image = extractOgImage(html);
      if (image) story.image = image;
    })
  );
  return stories;
}

/** Pull title+href pairs from anchors matching a path prefix. */
export function extractListingLinks(
  html: string,
  opts: {
    host: string;
    pathIncludes: string;
    skipPath?: RegExp;
    minTitleLen?: number;
  }
): { title: string; url: string }[] {
  const min = opts.minTitleLen ?? 22;
  const skip = opts.skipPath ?? /\/(calendario|tabla|estadisticas|videos?)\/?$/i;
  const re = new RegExp(
    `<a[^>]+href="(https?://${opts.host.replace(/\./g, '\\.')})?([^"#?]+)"[^>]*>([\\s\\S]*?)</a>`,
    'gi'
  );
  const out: { title: string; url: string }[] = [];
  const seen = new Set<string>();

  for (const m of html.matchAll(re)) {
    const path = m[2];
    if (!path.includes(opts.pathIncludes)) continue;
    if (skip.test(path)) continue;
    // Prefer article slugs, not bare section roots
    const depth = path.split('/').filter(Boolean).length;
    if (depth < 3) continue;

    const title = stripTags(m[3]);
    if (title.length < min) continue;
    // Skip pure scoreboard chips like "finalizado QRO 3 - 2"
    if (/^finalizado\b/i.test(title)) continue;
    if (/^\d+:\d+\s*min\b/i.test(title)) continue;

    const url = path.startsWith('http') ? path : `https://${opts.host}${path}`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title, url });
  }

  return out;
}
