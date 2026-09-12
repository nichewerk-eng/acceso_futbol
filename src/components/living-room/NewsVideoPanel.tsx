'use client';

import { Player } from '@remotion/player';
import { useCallback, useEffect, useState } from 'react';
import { NewsVideo } from '@/remotion/NewsVideo';
import type { NewsVideoPlan, NewsVideoRecord } from '@/lib/news/video/types';
import {
  NEWS_VIDEO_FPS,
  NEWS_VIDEO_HEIGHT,
  NEWS_VIDEO_WIDTH,
} from '@/lib/news/video/types';

type Props = {
  episodeId: string;
};

function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export function NewsVideoPanel({ episodeId }: Props) {
  const [rec, setRec] = useState<NewsVideoRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [renderBusy, setRenderBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [desk, setDesk] = useState(false);

  useEffect(() => {
    setDesk(isLocalHost());
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`/api/news/video/${encodeURIComponent(episodeId)}`, {
        cache: 'no-store',
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `http_${r.status}`);
      }
      setRec((await r.json()) as NewsVideoRecord);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    }
  }, [episodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate(force = false) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/news/video/${encodeURIComponent(episodeId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `http_${r.status}`);
      }
      setRec((await r.json()) as NewsVideoRecord);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      setBusy(false);
    }
  }

  async function renderMp4() {
    setRenderBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/news/video/${encodeURIComponent(episodeId)}/render`, {
        method: 'POST',
      });
      const j = (await r.json().catch(() => ({}))) as NewsVideoRecord & {
        error?: string;
        hint?: string;
      };
      if (!r.ok) throw new Error(j.hint || j.error || `http_${r.status}`);
      setRec(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      setRenderBusy(false);
    }
  }

  const plan: NewsVideoPlan | null = rec?.plan ?? null;
  const downloadUrl = `/api/news/video/${encodeURIComponent(episodeId)}/file?download=1`;
  const hasVideo = Boolean(rec?.videoUrl || rec?.renderedAt);

  if (!desk) {
    if (!plan) return null;
    return (
      <section className="mt-12 border-t border-line pt-10" data-testid="news-video">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://NEWS · VIDEO 9:16
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold uppercase tracking-wide">
          Video para redes
        </h2>
        <div className="mt-8 overflow-hidden rounded-sm bg-brand-blue">
          <div className="mx-auto w-full max-w-[320px]">
            <Player
              component={NewsVideo}
              inputProps={{ plan }}
              durationInFrames={Math.max(1, Math.round(plan.durationSeconds * NEWS_VIDEO_FPS))}
              compositionWidth={NEWS_VIDEO_WIDTH}
              compositionHeight={NEWS_VIDEO_HEIGHT}
              fps={plan.fps || NEWS_VIDEO_FPS}
              style={{ width: '100%', aspectRatio: '9 / 16' }}
              controls
              loop
              autoPlay={false}
              acknowledgeRemotionLicense
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-12 border-t border-line pt-10" data-testid="news-video">
      <p className="af-tele text-foreground">
        <span className="text-signal">AF</span>
        ://NEWS · VIDEO 9:16 · DESK
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold uppercase tracking-wide">
        Video para redes
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Desk local: arma el plan y exporta MP4. En producción solo se ve el preview.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-signal" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="af-cta !py-2"
          disabled={busy}
          onClick={() => void generate(true)}
        >
          {busy ? 'Armando plan…' : 'Generar plan'}
        </button>
        {plan ? (
          <button
            type="button"
            className="af-cta-ghost !py-2"
            disabled={renderBusy}
            onClick={() => void renderMp4()}
          >
            {renderBusy ? 'Renderizando MP4…' : 'Exportar MP4'}
          </button>
        ) : null}
        {hasVideo ? (
          <a href={downloadUrl} className="af-cta-ghost !py-2" download={`${episodeId}.mp4`}>
            Bajar MP4
          </a>
        ) : null}
      </div>

      {plan && !hasVideo ? (
        <p className="mt-4 text-xs text-muted">
          CLI: <code className="font-mono">npm run render:news -- {episodeId}</code>
        </p>
      ) : null}

      {plan ? (
        <div className="mt-8 overflow-hidden rounded-sm bg-brand-blue">
          <div className="mx-auto w-full max-w-[320px]">
            <Player
              component={NewsVideo}
              inputProps={{ plan }}
              durationInFrames={Math.max(1, Math.round(plan.durationSeconds * NEWS_VIDEO_FPS))}
              compositionWidth={NEWS_VIDEO_WIDTH}
              compositionHeight={NEWS_VIDEO_HEIGHT}
              fps={plan.fps || NEWS_VIDEO_FPS}
              style={{ width: '100%', aspectRatio: '9 / 16' }}
              controls
              loop
              autoPlay={false}
              acknowledgeRemotionLicense
            />
          </div>
          <p className="px-4 py-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-brand-yellow/80">
            {plan.scenes.length} escenas · {Math.round(plan.durationSeconds)}s · {plan.source}
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">
          Pulsa Generar plan para armar el timeline de gráficos.
        </p>
      )}
    </section>
  );
}
