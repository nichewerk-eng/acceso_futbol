'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RitualSlot } from '@/components/ritual/RitualSlot';
import { startLivePoll } from '@/lib/client/livePoll';

type Beat = {
  id: string;
  text: string;
  kind: string;
  createdAt: number;
};

/** Single Acceso voice for now. */
const RADIO_STYLE = 'caliente';

export function RadioCompanion({ league, matchId }: { league: string; matchId: string }) {
  const [playing, setPlaying] = useState(false);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [line, setLine] = useState('Pulsa play para entrar a la cabina.');
  const [mode, setMode] = useState<'live' | 'preshow' | 'recap' | 'off'>('live');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  const busyRef = useRef(false);
  const playingRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch(`/api/radio/match/${league}/${matchId}?style=${RADIO_STYLE}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d) return;
          setBeats(d.beats ?? []);
          setEnabled(d.enabled !== false);
          if (d.mode === 'preshow' || d.mode === 'recap' || d.mode === 'live' || d.mode === 'off') {
            setMode(d.mode);
          }
        })
        .catch(() => {});
    };
    const stop = startLivePoll(load, { getPace: () => 'idle' });
    return () => {
      cancelled = true;
      stop();
      revokeObjectUrl();
    };
  }, [league, matchId, revokeObjectUrl]);

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

  async function fetchTtsBlob(beat: Beat): Promise<Blob | null> {
    try {
      const r = await fetch('/api/radio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: beat.id,
          text: beat.text,
          style: RADIO_STYLE,
        }),
      });
      if (!r.ok) return null;
      return await r.blob();
    } catch {
      return null;
    }
  }

  function playNext(queue: Beat[]) {
    if (!playingRef.current || busyRef.current) return;
    const next = queue.find((b) => !spokenRef.current.has(b.id));
    if (!next) return;

    spokenRef.current.add(next.id);
    setLine(next.text);
    busyRef.current = true;

    const done = () => {
      revokeObjectUrl();
      busyRef.current = false;
      if (playingRef.current) playNext(queue);
    };

    void (async () => {
      if (!playingRef.current) {
        busyRef.current = false;
        return;
      }

      const blob = await fetchTtsBlob(next);
      if (!playingRef.current) {
        busyRef.current = false;
        return;
      }

      if (blob && typeof Audio !== 'undefined') {
        try {
          audioRef.current?.pause();
          revokeObjectUrl();
          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          const a = new Audio(url);
          audioRef.current = a;
          a.onended = done;
          a.onerror = () => speakFallback(next.text, done);
          await a.play();
          return;
        } catch {
          /* fall through */
        }
      }

      speakFallback(next.text, done);
    })();
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
      revokeObjectUrl();
      window.speechSynthesis?.cancel();
      return;
    }
    setPlaying(true);
  }

  const ready = enabled && beats.length > 0;

  return (
    <section id="radio" className="border border-line bg-bg-2" data-testid="match-radio">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>
            ://RADIO
            {mode === 'preshow' ? ' · PRE-SHOW' : mode === 'recap' ? ' · RECAP' : ''}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted">
            {mode === 'preshow'
              ? 'Podcast previo · arranca ~15 min antes'
              : mode === 'recap'
                ? 'Podcast postpartido · crónica + datos'
                : 'Cabina Acceso'}
            {!enabled ? ' · pausado' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={!ready}
          data-testid="match-radio-play"
          className="af-cta !py-2 disabled:opacity-40"
        >
          {playing ? 'Pausa' : '▶ Escuchar'}
        </button>
      </div>

      <div className="border-t border-line px-4 py-4">
        <p className="font-display text-lg font-semibold uppercase leading-snug tracking-wide text-foreground">
          {line}
        </p>
        <p className="mt-2 af-tele">
          {beats.length} segmentos. No es TV en vivo.
        </p>
      </div>

      <div className="border-t border-line px-4 py-3">
        <RitualSlot placement="radio" compact />
      </div>
    </section>
  );
}
