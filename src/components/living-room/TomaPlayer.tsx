'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { TomaShare } from '@/components/living-room/TomaShare';
import { jornadaTakeDeskTitle, type JornadaTake } from '@/lib/sports/jornadaTake';

type TomaCut = {
  id: string;
  audioUrl: string;
  title: string;
  label: string;
  cue: string;
  shareText?: string;
  jornadaNum?: number;
};

export function TomaDeskSkeleton() {
  return (
    <div className="toma-senal" data-testid="toma-player" data-loading="1" aria-busy="true">
      <div className="toma-senal-scan" aria-hidden />
      <div className="toma-senal-top">
        <p className="toma-senal-id">
          <span className="text-signal">AF</span>
          ://TOMA
        </p>
        <p className="toma-onair">armando</p>
      </div>
      <div className="toma-senal-desk">
        <div className="toma-capsule" aria-hidden>
          <span className="toma-capsule-ring" />
          <span className="toma-capsule-core">
            <span className="toma-capsule-spin" />
          </span>
        </div>
        <div className="toma-senal-now">
          <span className="toma-skel toma-skel-title" />
          <span className="toma-skel toma-skel-line" />
        </div>
      </div>
    </div>
  );
}

/**
 * Plays ONLY the pre-generated single-narrator MP3 episode (one ElevenLabs call
 * at generation, then served from Blob). If no episode exists yet, the capsule
 * renders nothing — we never synthesize per-corte on the client, to avoid extra
 * ElevenLabs cost. The written Toma column stays visible in the parent.
 * Every stored cut for this jornada stays on the desk until the next fecha.
 */
export function TomaPlayer({ take }: { take: JornadaTake }) {
  const pathname = usePathname();
  const [cuts, setCuts] = useState<TomaCut[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState(false);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const playingRef = useRef(false);
  const pathRef = useRef(pathname);
  const selectedIdRef = useRef<string | null>(null);
  const cutsRef = useRef<TomaCut[]>([]);
  const takeKey = `${take.jornadaNum ?? 'x'}-${take.headline}-${take.body?.length ?? 0}`;
  const takeKeyRef = useRef(takeKey);

  selectedIdRef.current = selectedId;
  cutsRef.current = cuts;

  const selected = cuts.find((c) => c.id === selectedId) ?? cuts[cuts.length - 1] ?? null;

  const revoke = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    setBusy(false);
    setHeld(false);
    setProgress(0);
    audioRef.current?.pause();
    audioRef.current = null;
    revoke();
  }, [revoke]);

  const pausePlayback = useCallback(() => {
    if (!playingRef.current) return;
    playingRef.current = false;
    setPlaying(false);
    setBusy(false);
    setHeld(Boolean(audioRef.current));
    audioRef.current?.pause();
  }, []);

  useEffect(() => {
    if (takeKey !== takeKeyRef.current) {
      takeKeyRef.current = takeKey;
      stop();
      setCuts([]);
      setSelectedId(null);
      selectedIdRef.current = null;
    }
  }, [takeKey, stop]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/toma/episode', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (
            d: {
              episodes?: TomaCut[];
              episode?: TomaCut | { audioUrl?: string; id?: string } | null;
            } | null
          ) => {
            const asCut = (e: {
              id?: string;
              audioUrl?: string;
              title?: string;
              label?: string;
              cue?: string;
              shareText?: string;
              jornadaNum?: number;
            }): TomaCut | null =>
              e.id && e.audioUrl
                ? {
                    id: e.id,
                    audioUrl: e.audioUrl,
                    title: e.title ?? 'Toma',
                    label: e.label ?? 'Toma',
                    cue: e.cue ?? '',
                    shareText: e.shareText,
                    jornadaNum: e.jornadaNum,
                  }
                : null;
            const list = (Array.isArray(d?.episodes) ? d.episodes : [])
              .map(asCut)
              .filter((e): e is TomaCut => e != null);
            const fallback = d?.episode ? asCut(d.episode) : null;
            const next = list.length > 0 ? list : fallback ? [fallback] : [];
            if (cancelled || next.length === 0) return;
            setCuts(next);
            setSelectedId((cur) =>
              cur && next.some((c) => c.id === cur) ? cur : next[next.length - 1]!.id
            );
          }
        )
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [take.jornadaNum]);

  useEffect(() => {
    if (pathname !== pathRef.current) {
      pathRef.current = pathname;
      pausePlayback();
    }
  }, [pathname, pausePlayback]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') pausePlayback();
    };
    const onHash = () => {
      const h = window.location.hash.replace(/^#/, '');
      if (h === 'toma' || h === 'jornada') return;
      pausePlayback();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', pausePlayback);
    window.addEventListener('hashchange', onHash);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', pausePlayback);
      window.removeEventListener('hashchange', onHash);
    };
  }, [pausePlayback]);

  useEffect(() => {
    const root = document.getElementById('toma');
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry && !entry.isIntersecting) pausePlayback();
      },
      { threshold: 0.2 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, [pausePlayback]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !playing) return;
    const tick = () => {
      if (a.duration && Number.isFinite(a.duration)) {
        setProgress(a.currentTime / a.duration);
      }
    };
    a.addEventListener('timeupdate', tick);
    return () => a.removeEventListener('timeupdate', tick);
  }, [playing]);

  const playEpisode = useCallback(
    async (url: string) => {
      playingRef.current = true;
      setPlaying(true);
      setHeld(false);
      setBusy(true);
      setProgress(0);
      audioRef.current?.pause();
      revoke();
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error('episode');
        const blob = await r.blob();
        const obj = URL.createObjectURL(blob);
        objectUrlRef.current = obj;
        const a = new Audio(obj);
        audioRef.current = a;
        a.onended = () => stop();
        a.onerror = () => {
          setBusy(false);
          stop();
        };
        setBusy(false);
        await a.play();
        if (!playingRef.current) a.pause();
      } catch {
        setBusy(false);
        stop();
      }
    },
    [revoke, stop]
  );

  const playCut = useCallback(
    async (cut: TomaCut) => {
      setSelectedId(cut.id);
      selectedIdRef.current = cut.id;
      await playEpisode(cut.audioUrl);
    },
    [playEpisode]
  );

  async function resumeHeld() {
    const a = audioRef.current;
    playingRef.current = true;
    setPlaying(true);
    setHeld(false);
    if (a && a.paused && !a.ended) {
      try {
        await a.play();
        if (!playingRef.current) a.pause();
        return;
      } catch {
        /* fall through to replay */
      }
    }
    const cut =
      cutsRef.current.find((c) => c.id === selectedIdRef.current) ??
      cutsRef.current[cutsRef.current.length - 1];
    if (cut) await playCut(cut);
    else stop();
  }

  async function toggleMaster() {
    if (playing) {
      pausePlayback();
      return;
    }
    if (held) {
      void resumeHeld();
      return;
    }
    if (selected) void playCut(selected);
  }

  function onCorte(cut: TomaCut) {
    if (cut.id === selectedId && playing) {
      pausePlayback();
      return;
    }
    if (cut.id === selectedId && held) {
      void resumeHeld();
      return;
    }
    void playCut(cut);
  }

  const live = playing && !busy;
  const masterLabel = playing ? (busy ? 'Armando voz…' : 'Pausa') : held ? 'Seguir' : 'Al aire';

  if (cuts.length === 0) return null;

  const deskTitle = selected?.title?.trim() || jornadaTakeDeskTitle(take);

  return (
    <div className="toma-senal" data-testid="toma-player" data-live={live ? '1' : '0'}>
      <div className="toma-senal-scan" aria-hidden />
      <div className="toma-senal-top">
        <p className="toma-senal-id">
          <span className="text-signal">AF</span>
          ://TOMA
        </p>
        <p className={live ? 'toma-onair is-on' : 'toma-onair'}>
          {live ? '● al aire' : held ? 'en pausa' : ''}
        </p>
        <TomaShare cut={selected} />
      </div>

      <div className="toma-senal-desk">
        <button
          type="button"
          className={live ? 'toma-capsule is-play' : 'toma-capsule'}
          data-testid="toma-listen"
          aria-label={masterLabel}
          aria-pressed={playing}
          onClick={() => void toggleMaster()}
        >
          <span className="toma-capsule-ring" aria-hidden />
          <span className="toma-capsule-core">
            {playing && !busy ? (
              <svg className="toma-capsule-icon" viewBox="0 0 24 24" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg className="toma-capsule-icon is-play" viewBox="0 0 24 24" aria-hidden>
                <path d="M9 6.2v11.6L18.4 12z" />
              </svg>
            )}
          </span>
        </button>

        <div className="toma-senal-now">
          {selected ? <p className="toma-now-kicker">{selected.label}</p> : null}
          <p className="toma-now-line" data-testid="toma-lead">
            {deskTitle}
          </p>
          {selected?.cue ? <p className="toma-corte-cue toma-now-cue">{selected.cue}</p> : null}
          {playing || held ? (
            <div className="toma-progress" aria-hidden>
              <span style={{ width: `${Math.max(2, progress * 100)}%` }} />
            </div>
          ) : null}
        </div>
      </div>

      <ul className="toma-cortes" data-testid="toma-cortes">
        {cuts.map((cut, i) => {
          const on = cut.id === selected?.id;
          const go = on && live ? 'al aire' : on && held ? 'en pausa' : 'oír';
          return (
            <li key={cut.id}>
              <button
                type="button"
                className={on ? 'toma-corte is-on' : 'toma-corte'}
                data-testid={`toma-corte-${cut.id}`}
                aria-pressed={on && playing}
                onClick={() => onCorte(cut)}
              >
                <span className="toma-corte-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="toma-corte-copy">
                  <span className="toma-corte-label">{cut.title}</span>
                  <span className="toma-corte-cue">{cut.cue || cut.label}</span>
                </span>
                <span className="toma-corte-go">{go}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
