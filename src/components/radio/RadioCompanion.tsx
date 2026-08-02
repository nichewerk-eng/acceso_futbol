'use client';

import { useEffect, useRef, useState } from 'react';
import { RitualSlot } from '@/components/ritual/RitualSlot';

type Beat = {
  id: string;
  text: string;
  kind: string;
  audioPath?: string;
  createdAt: number;
};

/** Single Acceso voice for now. */
const RADIO_STYLE = 'caliente';

export function RadioCompanion({ league, matchId }: { league: string; matchId: string }) {
  const [playing, setPlaying] = useState(false);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [delaySec, setDelaySec] = useState(30);
  const [enabled, setEnabled] = useState(true);
  const [line, setLine] = useState('Pulsa play para entrar a la cabina.');
  const [mode, setMode] = useState<'live' | 'preshow' | 'recap' | 'off'>('live');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  const playingRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch(`/api/radio/match/${league}/${matchId}?style=${RADIO_STYLE}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d) return;
          setBeats(d.beats ?? []);
          setDelaySec(d.delaySec ?? 30);
          setEnabled(d.enabled !== false);
          if (d.mode === 'preshow' || d.mode === 'recap' || d.mode === 'live' || d.mode === 'off') {
            setMode(d.mode);
          }
        })
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 12_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [league, matchId]);

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
    if (!next) return;

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
    playNext(beats);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queue driver
  }, [playing, beats]);

  function toggle() {
    if (playing) {
      setPlaying(false);
      playingRef.current = false;
      busyRef.current = false;
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    } else {
      setPlaying(true);
    }
  }

  return (
    <section id="radio" className="border border-line bg-bg-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            Acceso Radio
            {mode === 'preshow' ? ' · Pre-show' : mode === 'recap' ? ' · Recap' : ''}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted/70">
            {mode === 'preshow'
              ? 'Podcast previo · arranca ~15 min antes'
              : mode === 'recap'
                ? 'Podcast postpartido · crónica + datos'
                : `Transmisión Acceso · ~${delaySec}s de retraso`}
            {!enabled ? ' · pausado' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          className={[
            'px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition',
            playing ? 'border border-line text-foreground' : 'bg-signal text-on-signal',
          ].join(' ')}
        >
          {playing ? 'Pausa' : 'Play'}
        </button>
      </div>

      <div className="border-t border-line px-4 py-4">
        <p className="font-display text-lg font-semibold uppercase leading-snug tracking-wide text-foreground">
          {line}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted">
          {beats.length} segmentos
          {beats.some((b) => b.audioPath) ? ' · ElevenLabs' : ' · voz del navegador'}
        </p>
      </div>

      <div className="border-t border-line px-4 py-3">
        <RitualSlot placement="radio" compact />
      </div>
    </section>
  );
}
