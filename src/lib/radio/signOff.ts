export const TOMA_OUTRO = 'Esto fue La Toma de Acceso Futbol.';
export const NEWS_OUTRO = 'Estas fueron las noticias de Acceso Futbol.';

/** Last line of the VO. Dedupes if the model already closed that way. */
export function withSpokenOutro(body: string, outro: string): string {
  const text = body.trim();
  if (!text) return outro;
  const core = outro.replace(/[.!]+$/g, '').trim();
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const last = lines.at(-1) ?? '';
  const idx = last.toLowerCase().lastIndexOf(core.toLowerCase());
  const leftover =
    idx >= 0 ? last.slice(idx + core.length).replace(/[.!\s]+/g, '') : 'x';
  if (idx >= 0 && leftover === '') {
    const kept = last.slice(0, idx).trim();
    if (kept) lines[lines.length - 1] = kept;
    else lines.pop();
  }
  lines.push(outro);
  return lines.join('\n');
}
