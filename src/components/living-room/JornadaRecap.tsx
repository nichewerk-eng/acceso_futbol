'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { useGravity } from '@/contexts/GravityContext';
import type { Fixture } from '@/lib/sports';
import type { JornadaOverview } from '@/lib/sports/jornada';

function kickWhen(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function scorerLine(f: Fixture): string {
  const list = f.scorers ?? [];
  if (list.length === 0) {
    const hs = Number(f.home.score ?? 0);
    const as = Number(f.away.score ?? 0);
    if (hs === 0 && as === 0) return '0-0';
    return '';
  }
  const parts = list.map((s) => {
    const tag = s.pen ? ' (P)' : s.og ? ' (OG)' : '';
    return `${s.name}${s.minute ? ` ${s.minute}` : ''}${tag}`;
  });
  if (parts.length <= 3) return parts.join(' · ');
  return `${parts.slice(0, 2).join(' · ')} · +${parts.length - 2}`;
}

function ResultStamp({ f, mine }: { f: Fixture; mine: boolean }) {
  const live = f.state === 'in';
  const winner = f.winnerSide ?? null;
  const draw = !live && winner === null && f.state === 'post';
  const homeCls =
    winner === 'home' ? 'jor-team-win is-win' : winner === 'away' ? 'jor-team-lose is-lose' : draw ? 'jor-team-draw' : '';
  const awayCls =
    winner === 'away' ? 'jor-team-win is-win' : winner === 'home' ? 'jor-team-lose is-lose' : draw ? 'jor-team-draw' : '';
  const scorers = scorerLine(f);
  const resultTag = draw ? 'X' : winner === 'home' ? '1' : winner === 'away' ? '2' : live ? 'LIVE' : 'FT';

  return (
    <Link
      href={`/partido/liga-mx/${f.id}`}
      data-testid={`jornada-match-${f.id}`}
      className={[
        'jor-stamp jor-rise',
        live ? 'jor-stamp-live' : '',
        mine ? 'jor-stamp-mine' : '',
      ].join(' ')}
    >
      <div className="jor-stamp-meta">
        {live && <span className="hoy-live-dot" aria-hidden />}
        <span>{live ? f.clock || 'LIVE' : 'FT'}</span>
        {!live && <span aria-hidden>· {resultTag}</span>}
        {mine && <span className="text-signal">· LOCK</span>}
      </div>
      <div>
        <p className="jor-stamp-score">
          <span className={homeCls}>{f.home.score ?? 0}</span>
          <span className="mx-1 opacity-35">:</span>
          <span className={awayCls}>{f.away.score ?? 0}</span>
        </p>
        <div className="jor-stamp-teams">
          <span className={['jor-stamp-home inline-flex items-center gap-2', homeCls].join(' ')}>
            <ClubLogo abbr={f.home.abbreviation} name={f.home.name} size="sm" />
            {f.home.abbreviation}
          </span>
          <span className={['jor-stamp-away inline-flex items-center justify-end gap-2', awayCls].join(' ')}>
            {f.away.abbreviation}
            <ClubLogo abbr={f.away.abbreviation} name={f.away.name} size="sm" />
          </span>
        </div>
        {scorers ? (
          <p className="jor-stamp-scorers" title={scorers}>
            {scorers}
          </p>
        ) : (
          <p className="jor-stamp-scorers">&nbsp;</p>
        )}
      </div>
    </Link>
  );
}

function NextCard({ f, mine, tz }: { f: Fixture; mine: boolean; tz: string }) {
  return (
    <Link
      href={`/partido/liga-mx/${f.id}`}
      data-testid={`jornada-match-${f.id}`}
      className={['jor-next jor-rise', mine ? 'jor-next-mine' : ''].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="jor-next-when">{kickWhen(f.date, tz)}</p>
        {mine && <span className="af-tele !text-signal">LOCK</span>}
      </div>
      <div className="jor-next-vs">
        <span className="jor-next-side jor-next-home">
          <ClubLogo abbr={f.home.abbreviation} name={f.home.name} size="sm" />
          <span className="jor-next-abbr">{f.home.abbreviation}</span>
        </span>
        <span className="jor-next-mid">VS</span>
        <span className="jor-next-side jor-next-away">
          <ClubLogo abbr={f.away.abbreviation} name={f.away.name} size="sm" />
          <span className="jor-next-abbr">{f.away.abbreviation}</span>
        </span>
      </div>
      <p className="jor-next-when jor-next-cta">Ficha · radio al kick</p>
    </Link>
  );
}

export function JornadaRecap() {
  const { matchesGravity } = useGravity();
  const [data, setData] = useState<JornadaOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTz, setUserTz] = useState('America/Mexico_City');

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setUserTz(tz);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/jornada')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: JornadaOverview | null) => {
          if (!cancelled) {
            setData(d);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!loading && !data) return null;

  const played = data?.played ?? [];
  const live = data?.live ?? [];
  const upcoming = data?.upcoming ?? [];
  const doneBlock = [...live, ...played];
  const total = doneBlock.length + upcoming.length || 9;
  const doneCount = doneBlock.length;
  const jornadaNum = data?.number;

  const isMine = (f: Fixture) =>
    matchesGravity(f.home.name, f.away.name, f.home.abbreviation, f.away.abbreviation);

  return (
    <section
      id="jornada"
      data-testid="section-jornada"
      className="jor-board border-b border-line bg-bg-1 px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 grid gap-6 border-b border-line pb-8 lg:grid-cols-[auto_1fr_auto] lg:items-end lg:gap-10">
          <div>
            <p className="af-tele text-foreground">
              <span className="text-signal">AF</span>
              ://JORNADA
            </p>
            <p
              className="jor-num mt-1"
              data-testid="jornada-title"
              aria-label={data?.label ?? 'Jornada'}
            >
              {loading && !data ? '—' : jornadaNum ?? '—'}
            </p>
          </div>

          <div className="min-w-0 lg:pb-2">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-xl font-bold uppercase tracking-wide sm:text-2xl">
                {loading && !data ? 'Cargando fecha…' : 'Estado de la fecha'}
              </p>
              <p className="af-tele" data-testid="jornada-stats">
                {loading && !data
                  ? 'SYNC…'
                  : `${doneCount} jugados · ${upcoming.length} quedan`}
              </p>
            </div>
            <div
              className="jor-track"
              style={{ '--jor-total': total } as CSSProperties}
              data-testid="jornada-track"
              aria-hidden
            >
              {Array.from({ length: total }, (_, i) => {
                const liveIdx = live.length;
                const cls =
                  i < liveIdx
                    ? 'is-live'
                    : i < doneCount
                      ? 'is-done'
                      : i === doneCount
                        ? 'is-next'
                        : '';
                return <span key={i} className={['jor-track-cell', cls].filter(Boolean).join(' ')} />;
              })}
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">
              Resultados sellados y lo que todavía falta por patear.
            </p>
          </div>

          <Link href="/liga-mx" className="af-cta af-cta-ghost !py-2 self-end" data-testid="jornada-cta-tabla">
            Calendario
          </Link>
        </div>

        {loading && !data ? (
          <p className="af-tele py-8" data-testid="jornada-loading">
            Cargando jornada…
          </p>
        ) : (
          <div className="space-y-12" data-testid="jornada-columns">
            <div data-testid="jornada-played">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="font-display text-2xl font-bold uppercase tracking-wide">
                  {live.length > 0 ? 'En vivo + sellados' : 'Sellados'}
                </h3>
                <p className="af-tele">{doneBlock.length}</p>
              </div>
              {doneBlock.length === 0 ? (
                <p className="af-tele py-6 text-muted">Aún no hay resultados en esta fecha.</p>
              ) : (
                <div className="jor-mosaic">
                  {doneBlock.map((f) => (
                    <ResultStamp key={f.id} f={f} mine={isMine(f)} />
                  ))}
                </div>
              )}
            </div>

            <div data-testid="jornada-upcoming">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="font-display text-2xl font-bold uppercase tracking-wide">Quedan</h3>
                <p className="af-tele">{upcoming.length} por jugar</p>
              </div>
              {upcoming.length === 0 ? (
                <p className="af-tele py-6 text-muted">Fecha cerrada. Toda la jornada ya se jugó.</p>
              ) : (
                <div className="jor-mosaic">
                  {upcoming.map((f) => (
                    <NextCard key={f.id} f={f} mine={isMine(f)} tz={userTz} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
