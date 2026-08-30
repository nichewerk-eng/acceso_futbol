'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { ClubLink } from '@/components/club/ClubLink';
import { OnceFicha, OncePitch } from '@/components/living-room/OncePitch';
import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import { APERTURA_MATCHDAYS } from '@/lib/sports/liguillaPath';
import { useTotw } from '@/lib/client/useTotw';
import type { TotwClub, TotwPlayer, TotwBoard } from '@/lib/sports/totw';

function formatRating(n: number): string {
  return n.toFixed(2);
}

function RankRow({
  p,
  on,
  onSelect,
}: {
  p: TotwPlayer;
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
        on ? 'is-on' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="once-rank-n">{p.rank === 1 ? '★' : p.rank}</span>
      <ClubLogo
        abbr={p.teamAbbr}
        clubId={clubIdentityFromAbbr(p.teamAbbr)?.id}
        name={p.teamName}
        size="xs"
      />
      <span className="once-rank-who">
        <span className="once-rank-name">
          {p.shortName}
        </span>
        <span className="once-rank-club">{p.teamAbbr}</span>
      </span>
      <span className="once-rank-rating">{formatRating(p.rating)}</span>
    </button>
  );
}

function EquipoJornada({
  teams,
}: {
  teams: TotwClub[];
}) {
  const top = teams.slice(0, 5);
  if (!top.length) return null;
  const hero = top[0];
  const picked =
    hero.pickedWhy ?? `${hero.name} es el equipo de la jornada. ${hero.why}.`;

  return (
    <div className="once-eotw" data-testid="once-eotw">
      <div className="once-eotw-head">
        <div>
          <p className="once-eotw-kicker">Mejor club de la fecha</p>
          <h3 className="once-eotw-title">Equipo de la jornada</h3>
          <p className="once-eotw-picked" data-testid="once-eotw-picked">
            {picked}
          </p>
        </div>
      </div>

      <div className="once-eotw-board">
        {top.map((t) => {
          const first = t.rank === 1;
          return (
            <ClubLink
              key={t.abbr}
              abbr={t.abbr}
              title={t.name}
              className={[
                'once-eotw-tr',
                first ? 'is-1' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="once-rank-n">{first ? '★' : t.rank}</span>
              <span
                className="once-eotw-club"
                data-testid={first ? 'once-eotw-hero' : undefined}
              >
                <ClubLogo abbr={t.abbr} name={t.name} size="sm" />
                <span className="once-eotw-club-copy">
                  <span className="once-eotw-club-name">{t.name}</span>
                  <span className="once-eotw-club-abbr">
                    {t.abbr}
                  </span>
                </span>
              </span>
              <span className="once-eotw-result">
                <span className={`once-eotw-wdl is-${t.result.toLowerCase()}`}>{t.result}</span>
                <span>
                  {t.gf}-{t.ga} {t.home ? 'vs' : '@'} {t.opponentAbbr}
                </span>
              </span>
              <span className="once-rank-rating">{formatRating(t.score)}</span>
            </ClubLink>
          );
        })}
      </div>
    </div>
  );
}

export function OnceRoom({
  asPage = false,
  initial = null,
}: {
  asPage?: boolean;
  initial?: TotwBoard | null;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { payload, loading } = useTotw(picked, initial);
  const Title = asPage ? 'h1' : 'h3';

  const selected =
    payload?.players.find((p) => p.id === selectedId) ?? payload?.mvp ?? null;

  const pickerJornadas = useMemo(() => {
    const published = payload?.publishedJornadas ?? [];
    const pending = payload?.pendingJornada;
    const current = payload?.jornada;
    return Array.from({ length: APERTURA_MATCHDAYS }, (_, i) => i + 1).filter(
      (n) => published.includes(n) || pending === n || n === current
    );
  }, [payload?.publishedJornadas, payload?.pendingJornada, payload?.jornada]);

  useEffect(() => {
    setSelectedId(payload?.mvp?.id ?? payload?.ranking?.[0]?.id ?? null);
  }, [payload?.jornada, payload?.mvp?.id]);

  if (!loading && !payload) return null;

  const published = payload?.publishedJornadas ?? [];
  const pending = payload?.pendingJornada ?? null;
  const jornada = payload?.jornada;
  const empty = Boolean(payload && !payload.published);

  return (
    <section
      id="once"
      data-testid={asPage ? 'page-once' : 'section-once'}
      className="once-room once-room-full"
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
          <p className="once-room-dek">
            El once Acceso de la fecha. Toca un jugador para ver por qué está aquí.
          </p>
        </div>
        {payload?.formation ? (
          <p className="once-form-chip" aria-label={`Formación ${payload.formation}`}>
            {payload.formation}
          </p>
        ) : null}
      </div>

      {pickerJornadas.length > 0 ? (
        <div className="once-picker" data-testid="once-picker">
          {pickerJornadas.map((n) => {
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
      ) : null}

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
              ? `Jornada ${payload.jornada} ya se selló. El once Acceso sale cuando cierran los ratings de cada partido.`
              : 'El once de esta fecha llega después del último silbatazo.'}
          </p>
        </div>
      ) : payload?.players.length ? (
        <div className="once-grid">
          <OncePitch
            players={payload.players}
            formation={payload.formation ?? '4-3-3'}
            mvpId={payload.mvp?.id}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <div className="once-rail">
            <OnceFicha player={selected} mvpId={payload.mvp?.id} />

            <div className="once-rank" data-testid="once-ranking">
              <div className="once-rank-head">
                <p className="once-rank-title">Los 11</p>
                <p className="once-rank-head-meta">por rating</p>
              </div>
              {payload.ranking.map((p) => (
                <RankRow
                  key={p.id}
                  p={p}
                  on={selectedId === p.id}
                  onSelect={() => setSelectedId(p.id)}
                />
              ))}
            </div>
          </div>

          <EquipoJornada teams={payload.teams ?? []} />
        </div>
      ) : null}
    </section>
  );
}
