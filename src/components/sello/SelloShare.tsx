'use client';

import { useState, type ReactNode } from 'react';
import { trackClient } from '@/lib/analytics/trackClient';
import { followSelloMatch } from '@/lib/client/selloFollow';
import { selloCardPath, selloFileName, selloShareCopy } from '@/lib/sello/share';
import type { SelloMint } from '@/lib/sello/types';

type Props = {
  mint: SelloMint;
  className?: string;
  testId?: string;
  label?: string;
  /** Icon-only control (aria-label still uses `label`). */
  iconOnly?: boolean;
  children?: ReactNode;
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

/** Apple-style share (evil-icons / Wikimedia Ei-share-apple.svg, MIT). */
export function ShareIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 50 50"
      fill="currentColor"
      aria-hidden
    >
      <path d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z" />
      <path d="M24 7h2v21h-2z" />
      <path d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z" />
    </svg>
  );
}

/** Native share of the 9:16 PNG. Caption + permalink as fallback. */
export function SelloShare({
  mint,
  className,
  testId = 'sello-share',
  label = 'Compartir',
  iconOnly = false,
  children,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function share() {
    followSelloMatch(mint.league, mint.fixtureId);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}${mint.href}`;
    const copy = selloShareCopy(mint);
    const caption = url;
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
          await navigator.share({ title: copy.title, url });
          return;
        } catch (err) {
          if (isAbort(err)) return;
        }
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${copy.title}\n${url}`);
      }
    } finally {
      setBusy(false);
    }
  }

  const body = children ?? (
    iconOnly ? (
      busy ? (
        <span className="match-share-busy" aria-hidden>
          …
        </span>
      ) : (
        <ShareIcon />
      )
    ) : busy ? (
      'Armando…'
    ) : (
      label
    )
  );

  return (
    <button
      type="button"
      className={className}
      data-testid={testId}
      disabled={busy}
      aria-label={label}
      title={label}
      onClick={() => void share()}
    >
      {body}
    </button>
  );
}
