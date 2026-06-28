// Shared ESPN API fetcher. All upstream calls flow through here so we have
// one place to adjust headers, timeouts, or swap data sources.

const UA = 'AccesoFutbol/1.0';
const TIMEOUT_MS = 8_000;

export async function espnFetch(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: controller.signal,
      next: { revalidate: 30 },
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

export function scoreboardUrl(slug: string, dateRange: string, limit = 200) {
  return `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${dateRange}&limit=${limit}`;
}

export function summaryUrl(slug: string, eventId: string) {
  return `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/summary?event=${eventId}`;
}

export function leadersUrl(slug: string) {
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/leaders`;
}
