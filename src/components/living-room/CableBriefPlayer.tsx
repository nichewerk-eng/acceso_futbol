'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RecordingShare } from '@/components/living-room/RecordingShare';
import { briefStoreKey, playableBriefSlot } from '@/lib/radio/voiceSchedule';
import {
  newsShareCopy,
  newsSharePath,
  recordingFileName,
} from '@/lib/share/recordingShare';

type Beat = {
  id: string;
  text: string;
  kind: string;
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
  audioUrl?: string | null;
  recordedAt?: string | null;
  slot?: 'am' | 'pm' | null;
  shareText?: string | null;
  briefId?: string | null;
};

const RADIO_STYLE = 'caliente';
const REFRESH_MS = 5 * 60 * 1000;

export function CableBriefPlayer() {
  const [playing, setPlaying] = useState(false);
  const [payload, setPayload] = useState<BriefPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [line, setLine] = useState('Briefing de noticias · 8:00 y 18:00');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const playingRef = useRef(false);
  const briefIdRef = useRef<string | null>(null);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    audioRef.current?.pause();
    audioRef.current = null;
    revokeObjectUrl();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, [revokeObjectUrl]);

  const loadBrief = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const r = await fetch(`/api/radio/cable-brief?style=${RADIO_STYLE}`);
        const d = (r.ok ? await r.json() : null) as BriefPayload | null;
        if (!d) return;
        const nextId = d.id ?? d.audioUrl ?? null;
        if (nextId && briefIdRef.current && nextId !== briefIdRef.current && playingRef.current) {
          stop();
        }
        briefIdRef.current = nextId;
        setPayload(d);
        if (!playingRef.current) {
          setLine(d.beats?.[0]?.text ?? 'Briefing listo.');
        }
      } catch {
        /* keep last good payload */
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [stop]
  );

  useEffect(() => {
    void loadBrief(false);
    const tick = window.setInterval(() => {
      void loadBrief(true);
    }, REFRESH_MS);
    return () => {
      window.clearInterval(tick);
      stop();
    };
  }, [loadBrief, stop]);

  async function playStored(url: string) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('brief');
    const blob = await r.blob();
    const obj = URL.createObjectURL(blob);
    objectUrlRef.current = obj;
    const a = new Audio(obj);
    audioRef.current = a;
    a.onended = () => stop();
    a.onerror = () => stop();
    await a.play();
    if (!playingRef.current) a.pause();
  }

  function speakFallback(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      stop();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-MX';
    u.rate = 1.02;
    u.onend = () => stop();
    u.onerror = () => stop();
    window.speechSynthesis.speak(u);
  }

  async function toggle() {
    if (playing) {
      stop();
      return;
    }
    playingRef.current = true;
    setPlaying(true);
    const url = payload?.audioUrl;
    if (url) {
      try {
        await playStored(url);
        return;
      } catch {
        /* fall through */
      }
    }
    const text = (payload?.beats ?? []).map((b) => b.text).join(' ');
    if (text) speakFallback(text);
    else stop();
  }

  const ready = Boolean(payload?.audioUrl) || (payload?.beats?.length ?? 0) > 0;
  const recorded = (() => {
    if (!payload?.recordedAt) return null;
    try {
      return new Date(payload.recordedAt).toLocaleTimeString('es-MX', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  })();
  const meta = [
    payload?.slot === 'am' ? 'Mañana' : payload?.slot === 'pm' ? 'Tarde' : null,
    recorded ? `grabado ${recorded}` : null,
    payload?.jornadaLabel,
    payload?.storyCount ? `${payload.storyCount} notas` : null,
    payload?.sources?.slice(0, 3).join(' · '),
  ]
    .filter(Boolean)
    .join(' · ');

  const slotRef = playableBriefSlot();
  const briefId =
    payload?.briefId ??
    payload?.audioUrl?.match(/news-brief-[^/?]+/)?.[0] ??
    briefStoreKey(slotRef.dayKey, slotRef.slot);
  const fileUrl =
    payload?.audioUrl ?? `/api/radio/brief-audio/${encodeURIComponent(briefId)}`;
  const shareCopy = newsShareCopy({
    title: payload?.title ?? 'Briefing de noticias',
    slot: payload?.slot ?? slotRef.slot,
    transcript:
      payload?.shareText ||
      (payload?.beats ?? []).map((b) => b.text).join(' '),
  });

  return (
    <div
      data-testid="cable-brief"
      className="mb-8 border border-line bg-bg-2 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>
            ://NEWS · BRIEF
          </p>
          <p className="mt-1 font-display text-xl font-bold uppercase tracking-wide sm:text-2xl">
            {payload?.title ?? 'Briefing de noticias'}
          </p>
          <p className="mt-1 af-tele">
            {loading ? 'Armando cabina…' : meta || '8:00 y 18:00 México'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="cable-brief-play"
            onClick={() => void toggle()}
            disabled={!ready && !loading}
            className="af-cta !py-2 disabled:opacity-40"
          >
            {playing ? 'Pausa' : '▶ Escuchar'}
          </button>
          {ready ? (
            <RecordingShare
              title={shareCopy.title}
              text={shareCopy.text}
              path={newsSharePath(briefId)}
              fileUrl={fileUrl}
              fileName={recordingFileName('news', briefId)}
              className="toma-share"
              testId="cable-brief-share"
            />
          ) : null}
        </div>
      </div>

      <p
        data-testid="cable-brief-line"
        className="mt-4 border-t border-line pt-4 text-sm leading-6 text-muted sm:text-[15px]"
      >
        {line}
      </p>
      <p className="mt-2 af-tele">
        Corte grabado a las 8:00 y 18:00 · México. Play no gasta créditos.
      </p>
    </div>
  );
}
