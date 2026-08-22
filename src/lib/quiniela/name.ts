/** Placeholder / throwaway names we never put on the tabla. */
const ANON_RE = /^(an[oó]nimo|anonymous|anon|sin nombre|no name)$/i;

/** Display name for the tabla, or null if they still need to pick one. */
export function sanitizeName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const clean = v.replace(/\s+/g, ' ').trim().slice(0, 24);
  if (clean.length < 2 || ANON_RE.test(clean)) return null;
  return clean;
}
