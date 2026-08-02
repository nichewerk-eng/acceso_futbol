'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PulseNav } from '@/components/living-room/PulseNav';
import { RadioCompanion } from '@/components/radio/RadioCompanion';
import { RitualSlot } from '@/components/ritual/RitualSlot';
import type { MatchSnapshot } from '@/lib/sports';

type Props = { league: string; id: string };

export function MatchChapter({ league, id }: Props) {
  const [match, setMatch] = useState<MatchSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'cronica' | 'stats' | 'radio'>('cronica');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('tab') === 'radio' || window.location.hash === '#radio') {
      setTab('radio');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch(`/api/sports/match/${league}/${id}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: MatchSnapshot) => {
          if (!cancelled) {
            setMatch(d);
            setError(false);
          }
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    };
    load();
    const t = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [league, id]);

  const back = league === 'liga-mx' || league === 'seleccion' ? '/#hoy' : '/';

  if (error && !match) {
    return (
      <div className="min-h-screen bg-bg-1 text-foreground">
        <PulseNav />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="text-sm text-muted">No se pudo cargar el partido.</p>
          <Link href={back} className="mt-4 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-signal">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-1 text-muted">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Cargando capítulo…</p>
      </div>
    );
  }

  const live = match.state === 'in';

  return (
    <div className="min-h-screen bg-bg-1 text-foreground">
      <PulseNav />

      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Link
            href={back}
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:text-foreground"
          >
            ← {league === 'seleccion' ? 'El Tri' : league === 'liga-mx' ? 'Liga MX' : 'Pulso'}
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {live ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-signal">
                En vivo · {match.statusLabel}
              </span>
            ) : (
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                {match.statusLabel || (match.state === 'post' ? 'Final' : 'Próximo')}
              </span>
            )}
            {match.jornada && (
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted">{match.jornada}</span>
            )}
          </div>

          <h1 className="mt-4 font-display text-3xl font-semibold uppercase leading-none tracking-wide sm:text-5xl">
            {match.home.name}
            <span className="mx-3 text-muted">
              {match.state === 'pre' ? 'vs' : `${match.home.score ?? 0}–${match.away.score ?? 0}`}
            </span>
            {match.away.name}
          </h1>

          {(match.venue || match.city) && (
            <p className="mt-3 text-sm text-muted">
              {[match.venue, match.city].filter(Boolean).join(' · ')}
            </p>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <RitualSlot placement="donde-ver" />
            <div className="border border-line px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Dónde ver</p>
              <p className="mt-1 text-sm text-foreground">
                MX · {match.dondeVer?.mx ?? 'Streaming / TV local'}
              </p>
              <p className="text-sm text-muted">
                US · {match.dondeVer?.us ?? 'Univision · TUDN · ViX'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex gap-6 border-b border-line">
          {(
            [
              ['cronica', 'Crónica'],
              ['stats', 'Datos'],
              ['radio', 'Radio'],
            ] as const
          ).map(([idTab, label]) => (
            <button
              key={idTab}
              type="button"
              onClick={() => setTab(idTab)}
              className={[
                'pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition',
                tab === idTab
                  ? 'border-b-2 border-signal text-foreground'
                  : 'text-muted hover:text-foreground',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="py-8">
          {tab === 'radio' && <RadioCompanion league={league} matchId={id} />}

          {tab === 'cronica' && (
            <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Timeline</p>
                {match.events.length === 0 && match.comments.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">Sin eventos aún. Abre la pestaña Radio para la cabina.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-line border-y border-line">
                    {[
                      ...match.comments.map((c) => ({
                        id: `c-${c.id}`,
                        clock: c.minute !== undefined ? `${c.minute}'` : '',
                        text: c.text,
                        peak: c.isGoal,
                      })),
                      ...match.events.map((e) => ({
                        id: `e-${e.id}`,
                        clock: e.clock,
                        text: e.text || e.type,
                        peak: /gol|goal/i.test(`${e.type} ${e.text}`),
                      })),
                    ].map((row) => (
                      <li key={row.id} className="grid grid-cols-[64px_1fr] gap-4 py-3">
                        <span className="text-[11px] tabular-nums text-muted">{row.clock || '·'}</span>
                        <span className={row.peak ? 'text-foreground' : 'text-muted'}>{row.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <aside>
                <button
                  type="button"
                  onClick={() => setTab('radio')}
                  className="w-full border border-line px-4 py-4 text-left transition hover:border-foreground/30"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-signal">Acceso Radio</p>
                  <p className="mt-2 text-sm text-muted">Escucha Caliente, Táctico o Puente con ~30s de retraso.</p>
                </button>
              </aside>
            </div>
          )}

          {tab === 'stats' && (
            <div>
              {!match.stats?.length ? (
                <p className="text-sm text-muted">Estadísticas no disponibles.</p>
              ) : (
                <ul className="divide-y divide-line border-y border-line">
                  {match.stats.map((s) => (
                    <li key={s.label} className="grid grid-cols-3 items-center gap-4 py-3 text-sm">
                      <span className="font-semibold tabular-nums">{s.home}</span>
                      <span className="text-center text-[11px] uppercase tracking-[0.14em] text-muted">
                        {s.label}
                      </span>
                      <span className="text-right font-semibold tabular-nums">{s.away}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
