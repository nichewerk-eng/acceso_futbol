'use client';

import { Player } from '@remotion/player';
import { useCallback, useEffect, useState } from 'react';
import { TomaVideo } from '@/remotion/TomaVideo';
import type { TomaVideoPlan, TomaVideoRecord } from '@/lib/toma/video/types';
import {
  TOMA_VIDEO_FPS,
  TOMA_VIDEO_HEIGHT,
  TOMA_VIDEO_WIDTH,
} from '@/lib/toma/video/types';

type Props = {
  episodeId: string;
};

/** Remotion Chrome render only works on a machine with the CLI — not on Vercel. */
function canRenderInBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export function TomaVideoPanel({ episodeId }: Props) {
  const [rec, setRec] = useState<TomaVideoRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [renderBusy, setRenderBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localRender, setLocalRender] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocalRender(canRenderInBrowser());
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`/api/toma/video/${encodeURIComponent(episodeId)}`, {
        cache: 'no-store',
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `http_${r.status}`);
      }
      setRec((await r.json()) as TomaVideoRecord);
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
      const r = await fetch(`/api/toma/video/${encodeURIComponent(episodeId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `http_${r.status}`);
      }
      setRec((await r.json()) as TomaVideoRecord);
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
      const r = await fetch(`/api/toma/video/${encodeURIComponent(episodeId)}/render`, {
        method: 'POST',
      });
      const j = (await r.json().catch(() => ({}))) as TomaVideoRecord & {
        error?: string;
        hint?: string;
      };
      if (!r.ok) {
        throw new Error(j.hint || j.error || `http_${r.status}`);
      }
      setRec(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      setRenderBusy(false);
    }
  }

  const cli = `npm run render:toma -- ${episodeId}`;

  async function copyCli() {
    try {
      await navigator.clipboard.writeText(cli);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('No se pudo copiar. Corre el comando en la terminal del repo.');
    }
  }

  const plan: TomaVideoPlan | null = rec?.plan ?? null;
  const fileUrl = `/api/toma/video/${encodeURIComponent(episodeId)}/file`;
  const downloadUrl = `${fileUrl}?download=1`;
  const hasVideo = Boolean(rec?.videoUrl || rec?.renderedAt);

  return (
    <section className="mt-12 border-t border-line pt-10" data-testid="toma-video">
      <p className="af-tele text-foreground">
        <span className="text-signal">AF</span>
        ://TOMA · VIDEO 9:16
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold uppercase tracking-wide">
        Video para redes
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Previsualiza aquí. El MP4 se exporta en tu máquina (Remotion + Chrome), no en el sitio
        publicado.
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
        {plan && localRender ? (
          <button
            type="button"
            className="af-cta-ghost !py-2"
            disabled={renderBusy}
            onClick={() => void renderMp4()}
          >
            {renderBusy ? 'Renderizando MP4…' : 'Exportar MP4 (local)'}
          </button>
        ) : null}
        {hasVideo ? (
          <a href={downloadUrl} className="af-cta-ghost !py-2" download={`${episodeId}.mp4`}>
            Bajar MP4
          </a>
        ) : null}
        {plan && !localRender ? (
          <button type="button" className="af-cta-ghost !py-2" onClick={() => void copyCli()}>
            {copied ? 'Comando copiado' : 'Copiar comando de export'}
          </button>
        ) : null}
      </div>

      {plan && !hasVideo ? (
        <div className="mt-4 rounded-sm border border-line bg-bg-3 px-4 py-3 text-sm text-muted">
          <p className="font-medium text-foreground">Para bajar el MP4:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>En la carpeta del repo, corre:</li>
          </ol>
          <pre className="mt-2 overflow-x-auto bg-brand-blue px-3 py-2 font-mono text-[12px] text-brand-yellow">
            {cli}
          </pre>
          <p className="mt-2">
            El archivo queda en{' '}
            <code className="font-mono text-[12px]">.toma-local/{episodeId}.mp4</code>
          </p>
        </div>
      ) : null}

      {plan ? (
        <div className="mt-8 overflow-hidden rounded-sm bg-brand-blue">
          <div className="mx-auto w-full max-w-[320px]">
            <Player
              component={TomaVideo}
              inputProps={{ plan }}
              durationInFrames={Math.max(1, Math.round(plan.durationSeconds * TOMA_VIDEO_FPS))}
              compositionWidth={TOMA_VIDEO_WIDTH}
              compositionHeight={TOMA_VIDEO_HEIGHT}
              fps={plan.fps || TOMA_VIDEO_FPS}
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
