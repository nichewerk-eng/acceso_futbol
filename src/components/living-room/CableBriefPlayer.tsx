'use client';

import { useEffect, useRef, useState } from 'react';

type Beat = {
  id: string;
  text: string;
  kind: string;
  audioPath?: string;
  createdAt: number;
};

type BriefPayload = {
  title?: string;
  enabled?: boolean;
  sources?: string[];
  storyCount?: number;
  jornadaLabel?: string | null;
  beats?: Beat[];
};

/** Single Acceso voice for now. */
const RADIO_STYLE = 'caliente';

export function CableBriefPlayer() {
  const [playing, setPlaying] = useState(false);
  const [payload, setPayload] = useState<BriefPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [line, setLine] = useState('Briefing del cable · ~5 min');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  const playingRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/radio/cable-brief?style=${RADIO_STYLE}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: BriefPayload | null) => {
        if (!cancelled) {
          setPayload(d);
          setLoading(false);
          if (d?.beats?.length) {
            setLine(d.beats[0]?.text ?? 'Briefing listo.');
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      setLine('Briefing completo. Vuelve al cable.');
      return;
    }

    busyRef.current = true;
    spokenRef.current.add(next.id);
    setLine(next.text);

    const done = () => {
      busyRef.current = false;
      if (playingRef.current) playNext(queue);
    };

    if (next.audioPath) {
      const audio = new Audio(next.audioPath);
      audioRef.current = audio;
      audio.onended = done;
      audio.onerror = () => speakFallback(next.text, done);
      audio.play().catch(() => speakFallback(next.text, done));
      return;
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
  const meta = [
    payload?.jornadaLabel,
    payload?.storyCount ? `${payload.storyCount} notas` : null,
    payload?.sources?.slice(0, 3).join(' · '),
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
            {loading ? 'Armando cabina…' : meta || '~5 min · titulares + toma Acceso'}
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
        No leemos el artículo. Atribuimos la fuente y damos la toma Acceso.
      </p>
    </div>
  );
}
