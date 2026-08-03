// Shared ESPN API fetcher. All upstream calls flow through here so we have
// one place to adjust headers, timeouts, or swap data sources.

const UA = 'AccesoFutbol/1.0';
const TIMEOUT_MS = 8_000;

export async function espnFetch(
  url: string,
  opts?: { revalidate?: number | false }
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const revalidate = opts?.revalidate;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'es-MX,es;q=0.9',
      },
      signal: controller.signal,
      ...(revalidate === false
        ? { cache: 'no-store' as const }
        : { next: { revalidate: revalidate ?? 5 } }),
    });
    if (!res.ok) throw new Error(`ESPN HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ESPN competition slugs
export const SLUG = {
  WORLD_CUP: 'fifa.world',
  LIGA_MX:   'mex.1',
} as const;

export function standingsUrl(slug: string) {
  return `https://site.api.espn.com/apis/v2/sports/soccer/${slug}/standings`;
}

export function scoreboardUrl(slug: string, dateRange: string, limit = 200, lang = 'es') {
  return `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${dateRange}&limit=${limit}&lang=${lang}`;
}

export function summaryUrl(slug: string, eventId: string, lang = 'es') {
  return `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/summary?event=${eventId}&lang=${lang}`;
}

export function leadersUrl(slug: string) {
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/leaders`;
}
