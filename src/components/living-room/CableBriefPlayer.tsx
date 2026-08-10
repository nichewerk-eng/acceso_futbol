'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Beat = {
  id: string;
  text: string;
  kind: string;
  audioPath?: string;
  createdAt: number;
};

type BriefPayload = {
  id?: string;
  title?: string;
  enabled?: boolean;
  sources?: string[];
  storyCount?: number;
  jornadaLabel?: string | null;
  expiresAt?: string;
  beats?: Beat[];
};

/** Single Acceso voice for now. */
const RADIO_STYLE = 'caliente';
/** Client poll — server regenerates on a 2h bucket. */
const REFRESH_MS = 5 * 60 * 1000;

export function CableBriefPlayer() {
  const [playing, setPlaying] = useState(false);
  const [payload, setPayload] = useState<BriefPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [line, setLine] = useState('Briefing del cable · ~2:30');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  const playingRef = useRef(false);
  const briefIdRef = useRef<string | null>(null);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const loadBrief = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`/api/radio/cable-brief?style=${RADIO_STYLE}`);
      const d = (r.ok ? await r.json() : null) as BriefPayload | null;
      if (!d) return;
      const nextId = d.id ?? null;
      if (nextId && briefIdRef.current && nextId !== briefIdRef.current && playingRef.current) {
        // New cut arrived — stop current playback so the next listen is fresh.
        setPlaying(false);
        audioRef.current?.pause();
        if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
        busyRef.current = false;
        spokenRef.current = new Set();
      }
      if (nextId !== briefIdRef.current) {
        briefIdRef.current = nextId;
        spokenRef.current = new Set();
      }
      setPayload(d);
      if (d.beats?.length && !playingRef.current) {
        setLine(d.beats[0]?.text ?? 'Briefing listo.');
      }
    } catch {
      /* keep last good payload */
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrief(false);
    const tick = window.setInterval(() => {
      void loadBrief(true);
    }, REFRESH_MS);
    return () => window.clearInterval(tick);
  }, [loadBrief]);

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

  function playNext(queue: Beat[]) {
    if (!playingRef.current || busyRef.current) return;
    const next = queue.find((b) => !spokenRef.current.has(b.id));
    if (!next) {
      setPlaying(false);
      setLine('Briefing completo. Vuelve en un par de horas por el siguiente corte.');
      return;
    }

    spokenRef.current.add(next.id);
    setLine(next.text);
    busyRef.current = true;

    const done = () => {
      busyRef.current = false;
      if (playingRef.current) playNext(queue);
    };

    if (next.audioPath && typeof Audio !== 'undefined') {
      try {
        audioRef.current?.pause();
        const a = new Audio(next.audioPath);
        audioRef.current = a;
        a.onended = done;
        a.onerror = () => speakFallback(next.text, done);
        void a.play().catch(() => speakFallback(next.text, done));
        return;
      } catch {
        /* fall through */
      }
    }

    speakFallback(next.text, done);
  }

  useEffect(() => {
    if (!playing) return;
    playNext(payload?.beats ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queue driver
  }, [playing, payload?.beats]);

  function toggle() {
    if (playing) {
      setPlaying(false);
      audioRef.current?.pause();
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
      busyRef.current = false;
      return;
    }
    setPlaying(true);
  }

  const beats = payload?.beats ?? [];
  const ready = beats.length > 0;
  const nextCut = (() => {
    if (!payload?.expiresAt) return null;
    try {
      return new Date(payload.expiresAt).toLocaleTimeString('es-MX', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  })();
  const meta = [
    payload?.jornadaLabel,
    payload?.storyCount ? `${payload.storyCount} notas` : null,
    payload?.sources?.slice(0, 3).join(' · '),
    nextCut ? `nuevo corte ~${nextCut}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      data-testid="cable-brief"
      className="mb-8 border border-line bg-bg-2 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>
            ://CABLE · BRIEF
          </p>
          <p className="mt-1 font-display text-xl font-bold uppercase tracking-wide sm:text-2xl">
            {payload?.title ?? 'Briefing del cable'}
          </p>
          <p className="mt-1 af-tele">
            {loading ? 'Armando cabina…' : meta || '~2:30 · titulares del cable'}
          </p>
        </div>

        <button
          type="button"
          data-testid="cable-brief-play"
          onClick={toggle}
          disabled={!ready && !loading}
          className="af-cta !py-2 disabled:opacity-40"
        >
          {playing ? 'Pausa' : '▶ Escuchar'}
        </button>
      </div>

      <p
        data-testid="cable-brief-line"
        className="mt-4 border-t border-line pt-4 text-sm leading-6 text-muted sm:text-[15px]"
      >
        {line}
      </p>
      <p className="mt-2 af-tele">
        Corte fresco cada ~2 h · las notas de esta pantalla.
      </p>
    </div>
  );
}
