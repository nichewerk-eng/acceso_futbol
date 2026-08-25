/** Acceso Futbol web stream — public, same ID as the gtag snippet. */
const DEFAULT_GA_ID = 'G-Y15FMD6F9L';

/**
 * GA4 measurement ID. Prefers Vercel `GA_MEASUREMENT_ID`, then
 * `NEXT_PUBLIC_GA_MEASUREMENT_ID`. Empty value turns the tag off.
 */
export function gaMeasurementId(): string {
  const fromEnv =
    process.env.GA_MEASUREMENT_ID ?? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (fromEnv !== undefined) return fromEnv.trim();
  return DEFAULT_GA_ID;
}

/**
 * GA4 event names: [a-zA-Z][a-zA-Z0-9_]{0,39}. Our Vercel names have spaces.
 */
export function gaEventName(name: string): string {
  const slug = name
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return slug || 'custom_event';
}
