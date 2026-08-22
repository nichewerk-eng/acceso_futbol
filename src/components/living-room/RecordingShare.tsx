'use client';

import { useState } from 'react';

type Props = {
  title: string;
  text: string;
  path: string;
  fileUrl?: string | null;
  fileName?: string;
  className?: string;
  testId?: string;
};

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

async function fetchShareFile(url: string, fileName: string): Promise<File | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    const blob = await r.blob();
    const type = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'audio/mpeg';
    return new File([blob], fileName, { type });
  } catch {
    return null;
  }
}

function canShareFiles(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

/** Native share sheet: MP3 when the OS allows it, otherwise caption + permalink. */
export function RecordingShare({
  title,
  text,
  path,
  fileUrl,
  fileName = 'acceso.mp3',
  className,
  testId = 'recording-share',
}: Props) {
  const [busy, setBusy] = useState(false);

  async function share() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}${path.startsWith('/') ? path : `/${path}`}`;
    const caption = `${text}\n${url}`.trim();
    setBusy(true);
    try {
      const file = fileUrl ? await fetchShareFile(fileUrl, fileName) : null;
      if (file && canShareFiles(file) && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, text: caption, files: [file] });
          return;
        } catch (err) {
          if (isAbort(err)) return;
        }
      }
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, text, url });
          return;
        } catch (err) {
          if (isAbort(err)) return;
        }
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${title}\n${caption}`);
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
      {busy ? 'Armando…' : 'Compartir'}
    </button>
  );
}
