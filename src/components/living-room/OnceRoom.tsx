'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { OncePitch } from '@/components/living-room/OncePitch';
import { useGravity } from '@/contexts/GravityContext';
import { APERTURA_MATCHDAYS } from '@/lib/sports/liguillaPath';
import { useTotw } from '@/lib/client/useTotw';
import type { TotwPlayer, TotwBoard } from '@/lib/sports/totw';

function formatRating(n: number): string {
  return n.toFixed(2);
}

function RankRow({
  p,
  mine,
  on,
  onSelect,
}: {
  p: TotwPlayer;
  mine: boolean;
  on: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={`once-rank-${p.id}`}
      onClick={onSelect}
      className={[
        'once-rank-row',
        p.rank === 1 ? 'is-mvp' : '',
        mine ? 'is-mine' : '',
        on ? 'is-on' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="once-rank-n">{p.rank === 1 ? '★' : p.rank}</span>
      <span className="once-rank-who">
        <span className="once-rank-name">
          {p.shortName}
          {mine ? <span className="ml-2 af-tele !text-signal">LOCK</span> : null}
        </span>
        <span className="once-rank-club">{p.teamAbbr}</span>
      </span>
      <span className="once-rank-rating">{formatRating(p.rating)}</span>
    </button>
  );
}

export function OnceRoom({
  compact = false,
  asPage = false,
  initial = null,
}: {
  compact?: boolean;
  asPage?: boolean;
  initial?: TotwBoard | null;
}) {
  const { matchesGravity } = useGravity();
  const [picked, setPicked] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { payload, loading } = useTotw(compact ? null : picked, compact ? null : initial);
  const Title = asPage ? 'h1' : 'h3';

  const isMineAbbr = (abbr: string) => matchesGravity(abbr, abbr, abbr, abbr);
  const mineId = payload?.players.find((p) => isMineAbbr(p.teamAbbr))?.id ?? null;

  const jornadas = useMemo(
    () => Array.from({ length: APERTURA_MATCHDAYS }, (_, i) => i + 1),
    []
  );

  useEffect(() => {
    setSelectedId(null);
  }, [payload?.jornada]);

  if (!loading && !payload) return null;
  if (compact && !loading && !payload?.published) return null;

  const published = payload?.publishedJornadas ?? [];
  const pending = payload?.pendingJornada ?? null;
  const jornada = payload?.jornada;
  const empty = Boolean(payload && !payload.published);

  return (
    <section
      id="once"
      data-testid={asPage ? 'page-once' : 'section-once'}
      className={compact ? 'once-room' : 'once-room once-room-full'}
    >
      <div className="once-room-head">
        <div>
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>
            ://ONCE
          </p>
          <Title className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
            Once de la jornada{jornada ? ` ${jornada}` : ''}
          </Title>
          <p className="mt-2 max-w-lg font-mono text-[12px] leading-6 text-muted">
            Rating SM + resultado del equipo, rival ajustado. Click en un
            jugador: pasa el balón y sale el porqué de ese partido.
          </p>
        </div>
        {compact ? (
          <Link href="/once" className="af-cta af-cta-ghost !py-2" data-testid="once-archivo">
            Archivo
          </Link>
        ) : (
          <p className="af-tele">
            {payload?.formation ? `${payload.formation} · ` : ''}
            acceso
          </p>
        )}
      </div>

      {!compact && (
        <div className="once-picker" data-testid="once-picker">
          {jornadas.map((n) => {
            const on = published.includes(n);
            const wait = pending === n;
            const active = jornada === n;
            return (
              <button
                key={n}
                type="button"
                disabled={!on && !wait}
                data-testid={`once-jornada-${n}`}
                onClick={() => {
                  setPicked(n);
                  setSelectedId(null);
                }}
                className={[
                  'once-picker-btn',
                  active ? 'is-on' : '',
                  wait && !on ? 'is-wait' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                J{n}
              </button>
            );
          })}
        </div>
      )}

      {loading && !payload ? (
        <p className="af-tele py-8" data-testid="once-loading">
          Cargando once…
        </p>
      ) : empty ? (
        <div className="once-empty" data-testid="once-empty">
          <p className="font-display text-xl font-bold uppercase tracking-wide">
            {payload?.pending ? 'Once en cámara' : 'Sin once todavía'}
          </p>
          <p className="mt-2 max-w-md font-mono text-[12px] leading-6 text-muted">
            {payload?.pending
              ? `Jornada ${payload.jornada} ya se selló. La once Acceso sale cuando cierran los ratings de cada partido.`
              : 'La once de esta fecha llega después del último silbatazo.'}
          </p>
        </div>
      ) : payload?.players.length ? (
        <div className={compact ? 'once-grid is-compact' : 'once-grid'}>
          <OncePitch
            players={payload.players}
            formation={payload.formation ?? '4-3-3'}
            mvpId={payload.mvp?.id}
            mineId={mineId}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {!compact ? (
            <div className="once-rank" data-testid="once-ranking">
              <div className="once-rank-head">
                <p className="af-tele text-foreground">
                  <span className="text-signal">AF</span>
                  ://MEJORES
                </p>
                <p className="af-tele">acceso</p>
              </div>
              {payload.ranking.map((p) => (
                <RankRow
                  key={p.id}
                  p={p}
                  mine={isMineAbbr(p.teamAbbr)}
                  on={selectedId === p.id}
                  onSelect={() => setSelectedId(p.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
