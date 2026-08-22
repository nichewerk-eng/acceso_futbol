export const SHARE_TEXT_MAX = 280;

/** First lines of the script — the WhatsApp / iMessage caption. */
export function clipShareText(raw?: string | null, max = SHARE_TEXT_MAX): string {
  const t = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.length <= max) return t;
  const slice = t.slice(0, max - 1);
  const period = slice.lastIndexOf('. ');
  const space = slice.lastIndexOf(' ');
  const cut = period >= 80 ? period + 1 : space >= 80 ? space : slice.length;
  return `${slice.slice(0, cut).trim()}…`;
}

export function transcriptParagraphs(raw: string): string[] {
  const blocks = raw
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (blocks.length > 1) return blocks;
  const one = raw.replace(/\s+/g, ' ').trim();
  return one ? [one] : [];
}

export function tomaSharePath(id: string): string {
  return `/toma/${encodeURIComponent(id)}`;
}

export function newsSharePath(id: string): string {
  return `/news/${encodeURIComponent(id)}`;
}

export function recordingFileName(channel: 'toma' | 'news', id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, '-');
  const prefix = channel === 'toma' ? 'AF-TOMA' : 'AF-NEWS';
  return `${prefix}-${safe}.mp3`;
}

export function tomaShareCopy(ep: {
  title: string;
  cue?: string;
  jornadaNum?: number;
  transcript?: string | null;
}): { title: string; text: string } {
  const title = `AF://TOMA · ${ep.title}`;
  const lead = clipShareText(ep.transcript) || ep.cue?.trim() || 'La toma de Acceso Futbol.';
  const jornada = ep.jornadaNum != null ? `J${ep.jornadaNum}` : '';
  const text = [jornada, lead].filter(Boolean).join(' · ');
  return { title, text };
}

export function newsShareCopy(ep: {
  title: string;
  slot?: 'am' | 'pm' | null;
  transcript?: string | null;
}): { title: string; text: string } {
  const title = `AF://NEWS · ${ep.title}`;
  const slot = ep.slot === 'am' ? 'Mañana' : ep.slot === 'pm' ? 'Tarde' : '';
  const lead = clipShareText(ep.transcript) || 'Briefing de Liga MX.';
  const text = [slot, lead].filter(Boolean).join(' · ');
  return { title, text };
}

export function parseTomaEpisodeId(
  id: string
): { jornadaNum: number; dayKey: string } | null {
  if (!id.startsWith('toma-ep-') || id.includes('/') || id.includes('..')) return null;
  const m = /^toma-ep-j(\d+)-(antes|cierre|\d{4}-\d{2}-\d{2})$/.exec(id);
  if (!m) return null;
  const jornadaNum = Number(m[1]);
  if (!Number.isFinite(jornadaNum) || jornadaNum < 1) return null;
  return { jornadaNum, dayKey: m[2] };
}

export function parseNewsBriefId(
  id: string
): { dayKey: string; slot: 'am' | 'pm' } | null {
  if (id.includes('/') || id.includes('..')) return null;
  const m = /^news-brief-(\d{4}-\d{2}-\d{2})-(am|pm)$/.exec(id);
  if (!m) return null;
  return { dayKey: m[1], slot: m[2] as 'am' | 'pm' };
}
