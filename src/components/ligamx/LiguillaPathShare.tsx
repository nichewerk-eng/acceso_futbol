'use client';

import { liguillaShareCopy, type LiguillaPath } from '@/lib/sports/liguillaPath';

export function LiguillaPathShare({
  abbr,
  path,
}: {
  abbr: string;
  path: LiguillaPath;
}) {
  const copy = liguillaShareCopy(abbr, path);

  async function share() {
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}/liga-mx` : '/liga-mx';
    const payload = { title: copy.title, text: copy.text, url };
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share(payload);
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${copy.title}\n${copy.text}\n${url}`);
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'AbortError') return;
    }
  }

  return (
    <button
      type="button"
      className="lg-path-share"
      data-testid="liguilla-path-share"
      onClick={() => void share()}
    >
      Compartir
    </button>
  );
}
