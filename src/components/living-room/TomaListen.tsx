'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  jornadaTakeNarration,
  jornadaTakeNarrationKey,
  type JornadaTake,
} from '@/lib/sports/jornadaTake';

const RADIO_STYLE = 'caliente';

export function TomaListen({ take }: { take: JornadaTake }) {
  const pathname = usePathname();
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const playingRef = useRef(false);
  const keyRef = useRef(jornadaTakeNarrationKey(take));
  const narrKey = jornadaTakeNarrationKey(take);
  const pathRef = useRef(pathname);

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
    if (narrKey !== keyRef.current) {
      keyRef.current = narrKey;
      stop();
    }
  }, [narrKey, stop]);

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

  async function startFresh() {
    const text = jornadaTakeNarration(take);
    if (!text.trim()) return;

    playingRef.current = true;
    setPlaying(true);
    setHeld(false);
    setBusy(true);

    const done = () => {
      if (!playingRef.current) return;
      stop();
    };

    try {
      const r = await fetch('/api/radio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: jornadaTakeNarrationKey(take),
          text,
          style: RADIO_STYLE,
        }),
      });
      if (!playingRef.current) return;

      if (r.ok) {
        const blob = await r.blob();
        if (!playingRef.current) return;
        revoke();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const a = new Audio(url);
        audioRef.current = a;
        a.onended = done;
        a.onerror = () => speakFallback(text, done);
        setBusy(false);
        await a.play();
        if (!playingRef.current) {
          a.pause();
        }
        return;
      }
    } catch {
      /* browser voice */
    }

    if (!playingRef.current) return;
    setBusy(false);
    speakFallback(text, done);
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
    await startFresh();
  }

  function toggle() {
    if (playing) {
      pausePlayback();
      return;
    }
    if (held && audioRef.current && !audioRef.current.ended) {
      void resumeHeld();
      return;
    }
    void startFresh();
  }

  const live = playing && !busy;
  const label = playing ? (busy ? 'Armando voz…' : 'Pausa') : held ? 'Seguir' : 'Escuchar';

  return (
    <button
      type="button"
      className={['toma-share', 'toma-listen', live || held ? 'is-on' : '']
        .filter(Boolean)
        .join(' ')}
      data-testid="toma-listen"
      aria-label="Escuchar la toma"
      onClick={toggle}
      aria-pressed={playing}
    >
      <span className={live ? 'toma-wave is-play' : 'toma-wave'} aria-hidden>
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      {label}
    </button>
  );
}
