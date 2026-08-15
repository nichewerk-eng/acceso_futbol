'use client';

import { matchShareCopy } from '@/lib/share/matchShare';
import type { MatchSnapshot } from '@/lib/sports/types';

type Props = {
  match: MatchSnapshot;
  league: string;
};

export function MatchShare({ match, league }: Props) {
  const copy = matchShareCopy(match, league);

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
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
      className="match-share"
      data-testid="match-share"
      onClick={() => void share()}
    >
      Compartir
    </button>
  );
}
