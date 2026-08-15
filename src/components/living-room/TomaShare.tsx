'use client';

import { jornadaTakeShareCopy, type JornadaTake } from '@/lib/sports/jornadaTake';

export function TomaShare({ take }: { take: JornadaTake }) {
  const copy = jornadaTakeShareCopy(take);

  async function share() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/toma`;
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
    <button type="button" className="toma-share" data-testid="toma-share" onClick={() => void share()}>
      Compartir
    </button>
  );
}
