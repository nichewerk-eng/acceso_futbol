'use client';

import { useState } from 'react';
import { trackClient } from '@/lib/analytics/trackClient';
import { followSelloMatch } from '@/lib/client/selloFollow';
import { selloCardPath, selloFileName, selloShareCopy } from '@/lib/sello/share';
import type { SelloMint } from '@/lib/sello/types';

type Props = {
  mint: SelloMint;
  className?: string;
  testId?: string;
  label?: string;
};

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

async function fetchShareFile(url: string, fileName: string): Promise<File | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    const blob = await r.blob();
    const type = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/png';
    return new File([blob], fileName, { type });
  } catch {
    return null;
  }
}

function canShareFiles(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

async function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Native share of the 9:16 PNG. Caption + permalink as fallback. */
export function SelloShare({
  mint,
  className,
  testId = 'sello-share',
  label = 'Compartir',
}: Props) {
  const [busy, setBusy] = useState(false);

  async function share() {
    followSelloMatch(mint.league, mint.fixtureId);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}${mint.href}`;
    const copy = selloShareCopy(mint);
    const caption = `${copy.text}\n${url}`.trim();
    const cardUrl = `${origin}${selloCardPath(mint.league, mint.fixtureId, mint.gravityClubId)}`;
    setBusy(true);
    trackClient('Sello share', { kind: mint.kind, league: mint.league });
    try {
      const file = await fetchShareFile(cardUrl, selloFileName(mint));
      if (file && canShareFiles(file) && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: copy.title, text: caption, files: [file] });
          return;
        } catch (err) {
          if (isAbort(err)) return;
        }
      }
      if (file) {
        await downloadFile(file);
      }
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: copy.title, text: copy.text, url });
          return;
        } catch (err) {
          if (isAbort(err)) return;
        }
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${copy.title}\n${caption}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      data-testid={testId}
      disabled={busy}
      onClick={() => void share()}
    >
      {busy ? 'Armando…' : label}
    </button>
  );
}
