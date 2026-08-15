'use client';

export function TomaShare() {
  async function share() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/toma`;

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ url });
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
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
