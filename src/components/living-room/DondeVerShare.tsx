'use client';

import { dondeVerShareCopy } from '@/lib/share/dondeVerShare';
import type { Fixture } from '@/lib/sports';

type Props = {
  fixtures: Fixture[];
  jornadaNum?: number;
};

export function DondeVerShare({ fixtures, jornadaNum }: Props) {
  const copy = dondeVerShareCopy(fixtures, jornadaNum);

  async function share() {
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}/donde-ver` : '/donde-ver';
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
      className="dv-share"
      data-testid="donde-ver-share"
      onClick={() => void share()}
    >
      Compartir
    </button>
  );
}
