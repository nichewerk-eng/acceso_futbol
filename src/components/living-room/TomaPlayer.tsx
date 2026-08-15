'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { TomaShare } from '@/components/living-room/TomaShare';
import {
  jornadaTakeCortes,
  jornadaTakeDeskTitle,
  type JornadaTake,
  type TomaCorte,
} from '@/lib/sports/jornadaTake';

const RADIO_STYLE = 'caliente';

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

export function TomaPlayer({ take }: { take: JornadaTake }) {
  const pathname = usePathname();
  const cortes = useMemo(() => jornadaTakeCortes(take), [take]);
  const [episodeUrl, setEpisodeUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState(false);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const blobCache = useRef(new Map<string, Blob>());
  const playingRef = useRef(false);
  const idxRef = useRef(0);
  const cortesRef = useRef(cortes);
  const pathRef = useRef(pathname);
  const episodeUrlRef = useRef<string | null>(null);
  const takeKey = `${take.jornadaNum ?? 'x'}-${take.headline}-${take.body?.length ?? 0}`;
  const takeKeyRef = useRef(takeKey);

  cortesRef.current = cortes;
  episodeUrlRef.current = episodeUrl;

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
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, [revoke]);

  const pausePlayback = useCallback(() => {
    if (!playingRef.current) return;
    playingRef.current = false;
    setPlaying(false);
    setBusy(false);
    setHeld(Boolean(audioRef.current));
    audioRef.current?.pause();
    if (typeof window !== 'undefined') window.speechSynthesis?.pause?.();
  }, []);

  useEffect(() => {
    if (takeKey !== takeKeyRef.current) {
      takeKeyRef.current = takeKey;
      blobCache.current.clear();
      idxRef.current = 0;
      setActive(0);
      stop();
    }
  }, [takeKey, stop]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/toma/episode', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { episode?: { audioUrl?: string } | null } | null) => {
          const url = d?.episode?.audioUrl;
          if (!cancelled && url) setEpisodeUrl(url);
        })
        .catch(() => {});
    };
    load();
    if (episodeUrl) return () => {
      cancelled = true;
    };
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [take.jornadaNum, episodeUrl]);

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
  }, [playing, active]);

  function speakFallback(text: string, onEnd: () => void) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-MX';
    u.rate = 1.02;
    u.onend = onEnd;
    u.onerror = onEnd;
    window.speechSynthesis.speak(u);
  }

  async function fetchBlob(corte: TomaCorte): Promise<Blob | null> {
    const hit = blobCache.current.get(corte.id);
    if (hit) return hit;
    try {
      const r = await fetch('/api/radio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `toma-corte-${corte.id}`,
          text: corte.text,
          style: RADIO_STYLE,
        }),
      });
      if (!r.ok) return null;
      const blob = await r.blob();
      blobCache.current.set(corte.id, blob);
      return blob;
    } catch {
      return null;
    }
  }

  async function playEpisode(url: string) {
    playingRef.current = true;
    idxRef.current = 0;
    setActive(0);
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
  }

  async function playAt(i: number, skipEpisode = false) {
    const stored = skipEpisode ? null : episodeUrlRef.current;
    if (stored && i === 0) {
      await playEpisode(stored);
      return;
    }
    const list = cortesRef.current;
    const corte = list[i];
    if (!corte) {
      stop();
      return;
    }

    playingRef.current = true;
    idxRef.current = i;
    setActive(i);
    setPlaying(true);
    setHeld(false);
    setBusy(true);
    setProgress(0);
    audioRef.current?.pause();
    revoke();

    const done = () => {
      if (!playingRef.current) return;
      void playAt(i + 1);
    };

    const blob = await fetchBlob(corte);
    if (!playingRef.current || idxRef.current !== i) return;

    if (blob && typeof Audio !== 'undefined') {
      try {
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const a = new Audio(url);
        audioRef.current = a;
        a.onended = done;
        a.onerror = () => speakFallback(corte.text, done);
        setBusy(false);
        await a.play();
        if (!playingRef.current) a.pause();
        return;
      } catch {
        /* browser voice */
      }
    }

    if (!playingRef.current) return;
    setBusy(false);
    speakFallback(corte.text, done);
  }

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
        /* fall through */
      }
    }
    if (typeof window !== 'undefined' && window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
      return;
    }
    await playAt(idxRef.current);
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
    if (!episodeUrlRef.current) {
      try {
        const r = await fetch('/api/toma/episode', { cache: 'no-store' });
        const d = r.ok ? await r.json() : null;
        const url = d?.episode?.audioUrl as string | undefined;
        if (url) {
          setEpisodeUrl(url);
          episodeUrlRef.current = url;
        }
      } catch {
        /* cortes fallback */
      }
    }
    void playAt(idxRef.current);
  }

  const live = playing && !busy;
  const masterLabel = playing ? (busy ? 'Armando voz…' : 'Pausa') : held ? 'Seguir' : 'Al aire';

  if (cortes.length === 0 && !episodeUrl) return null;

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
        <TomaShare />
      </div>

      <div className="toma-senal-desk">
        <button
          type="button"
          className={live ? 'toma-capsule is-play' : 'toma-capsule'}
          data-testid="toma-listen"
          aria-label={masterLabel}
          aria-pressed={playing}
          onClick={toggleMaster}
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
          <p className="toma-now-line" data-testid="toma-lead">
            {jornadaTakeDeskTitle(take)}
          </p>
          {playing || held ? (
            <div className="toma-progress" aria-hidden>
              <span style={{ width: `${Math.max(2, progress * 100)}%` }} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
