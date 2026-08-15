'use client';

import { xiShareCopy } from '@/lib/share/xiShare';
import type { MatchSnapshot } from '@/lib/sports/types';

type Props = {
  match: MatchSnapshot;
  league: string;
};

export function MatchXiShare({ match, league }: Props) {
  const copy = xiShareCopy(match);

  async function share() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/partido/${league}/${match.id}/xi`;
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
      className="xi-share"
      data-testid="match-xi-share"
      onClick={() => void share()}
    >
      Compartir XI
    </button>
  );
}
