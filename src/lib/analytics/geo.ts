/** Vercel encodes non-ASCII city names (RFC 3986). */
export function decodeGeoHeader(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const v = decodeURIComponent(raw).replace(/\+/g, ' ').trim();
    return v ? v.slice(0, 80) : null;
  } catch {
    const v = raw.trim();
    return v ? v.slice(0, 80) : null;
  }
}

const CITY_ALIAS: Record<string, string> = {
  'mexico city': 'CDMX',
  'ciudad de mexico': 'CDMX',
  'ciudad de méxico': 'CDMX',
  'mexico, d.f.': 'CDMX',
  'mexico df': 'CDMX',
  'ciudad de mexico, d.f.': 'CDMX',
  'los angeles': 'LA',
  chicago: 'Chicago',
};

/** Short labels for the cities we actually compare. */
export function displayCity(city: string): string {
  return CITY_ALIAS[city.toLowerCase()] ?? city;
}

export function geoFromHeaders(headers: Headers): { city: string; country: string } | null {
  const city = decodeGeoHeader(headers.get('x-vercel-ip-city'));
  if (!city) return null;
  const country = (headers.get('x-vercel-ip-country') ?? '').trim().toUpperCase().slice(0, 8);
  return { city: displayCity(city), country: country || '??' };
}
