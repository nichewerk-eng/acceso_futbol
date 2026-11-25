'use client';

import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { DondeVerAir } from '@/components/living-room/DondeVerAir';
import { PartidoLink } from '@/components/partido/PartidoLink';
import { ligaMxClubIdFromAbbr } from '@/config/ligaMxLogos';
import { formatKickoffTime } from '@/lib/localTime';
import { kickHold, kickHoldLabel } from '@/lib/sports/localizeEs';
import {
  liguillaFixtureTag,
  type LiguillaBoard,
  type LiguillaRoundBoard,
  type LiguillaSeries,
  type LiguillaSide,
} from '@/lib/sports/liguilla';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';
import type { Fixture } from '@/lib/sports/types';

export function fmtDay(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

export function fmtDayLong(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return '';
  }
}

function isHt(f: Fixture) {
  return f.clock === 'HT' || /descanso/i.test(f.statusLabel || '');
}

/** Clock / FT / kickoff stamp for a leg. */
export function legStamp(f: Fixture, tz: string): string {
  if (f.state === 'in') return isHt(f) ? 'HT' : f.clock || 'En vivo';
  if (f.state === 'post') return f.penalties ? 'FT · Pen' : 'FT';
  if (f.home.placeholder || f.away.placeholder) return 'Por confirmar';
  return kickHoldLabel(kickHold(f.statusLabel)) ?? formatKickoffTime(f.date, tz);
}

function sideAbbr(f: Fixture, side: 'home' | 'away') {
  const t = f[side];
  return t.placeholder ? null : scheduleAbbr(t.abbreviation);
}

/** Goals one club scored in one leg (null before kickoff). */
function legGoals(f: Fixture | null, abbr: string | null): string {
  if (!f || !abbr || (f.state !== 'in' && f.state !== 'post')) return '–';
  if (sideAbbr(f, 'home') === abbr) return String(f.home.score ?? 0);
  if (sideAbbr(f, 'away') === abbr) return String(f.away.score ?? 0);
  return '–';
}

function seedOf(board: Pick<LiguillaBoard, 'seeds'> | null, abbr: string | null) {
  if (!board || !abbr) return null;
  return board.seeds.find((s) => s.abbr === abbr)?.seed ?? null;
}

const STATUS_LABEL: Record<LiguillaSeries['status'], string> = {
  tbd: 'Por definir',
  pre: 'Por jugar',
  live: 'En vivo',
  between: 'Ida jugada',
  post: 'Serie cerrada',
};

function SeriesRow({
  side,
  series,
  which,
}: {
  side: LiguillaSide;
  series: LiguillaSeries;
  which: 'high' | 'low';
}) {
  const won = series.winner === which;
  const lost = series.winner != null && !won;
  const leads = !series.winner && series.leader === which && series.aggregate != null;
  const agg = series.aggregate ? series.aggregate[which] : null;
  const clubId = side.abbr ? ligaMxClubIdFromAbbr(side.abbr) : undefined;
  return (
    <div
      className={['lq-srow', won ? 'is-win' : '', lost ? 'is-out' : '', leads ? 'is-lead' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <span className="lq-srow-seed">{side.seed ? `${side.seed}º` : ''}</span>
      <span className="lq-srow-club">
        {side.abbr ? (
          <ClubLogo abbr={side.abbr} clubId={clubId} name={side.name} size="xs" />
        ) : (
          <span className="lq-srow-gap" aria-hidden />
        )}
        <span className="lq-srow-copy">
          <span className="lq-srow-abbr">{side.abbr ?? '—'}</span>
          <span className="lq-srow-name">{side.name}</span>
        </span>
      </span>
      <span className="lq-srow-leg">{legGoals(series.ida, side.abbr)}</span>
      <span className="lq-srow-leg">{legGoals(series.vuelta, side.abbr)}</span>
      <span className="lq-srow-agg">{agg ?? '–'}</span>
    </div>
  );
}

export function SeriesCard({ series, tz }: { series: LiguillaSeries; tz: string }) {
  const { ida, vuelta } = series;
  const live = series.status === 'live';
  const focus =
    [ida, vuelta].find((f) => f?.state === 'in') ??
    (ida?.state === 'post' && vuelta ? vuelta : (ida ?? vuelta));
  const href = series.status !== 'tbd' && focus ? `/partido/liga-mx/${focus.id}` : null;
  const legsLine = [ida, vuelta]
    .map((f, i) => (f ? `${i === 0 ? 'Ida' : 'Vuelta'} ${fmtDay(f.date, tz)}` : null))
    .filter(Boolean)
    .join(' · ');

  const body = (
    <article
      className={[
        'lq-series',
        `lq-series-${series.round}`,
        `is-${series.status}`,
      ].join(' ')}
      data-testid={`liguilla-series-${series.key}`}
    >
      <header className="lq-series-head">
        <span className="lq-series-status">
          {live ? <span className="hoy-live-dot" aria-hidden /> : null}
          {STATUS_LABEL[series.status]}
        </span>
        <span className="lq-series-legs">{legsLine || 'Fechas por confirmar'}</span>
      </header>
      <div className="lq-srow lq-srow-head" aria-hidden>
        <span />
        <span />
        <span className="lq-srow-leg">Ida</span>
        <span className="lq-srow-leg">Vta</span>
        <span className="lq-srow-agg">Gbl</span>
      </div>
      <SeriesRow side={series.high} series={series} which="high" />
      <SeriesRow side={series.low} series={series} which="low" />
      <p className="lq-series-verdict">{series.verdict}</p>
    </article>
  );

  if (!href) return body;
  return (
    <Link href={href} className="lq-series-link">
      {body}
    </Link>
  );
}

export function LiguillaBracket({
  rounds,
  champion,
  tz,
}: {
  rounds: LiguillaRoundBoard[];
  champion: LiguillaSide | null;
  tz: string;
}) {
  return (
    <div className="lq-bracket" data-testid="liguilla-bracket">
      {rounds.map((r) => (
        <section key={r.round} className={`lq-col lq-col-${r.round} is-${r.state}`}>
          <header className="lq-col-head">
            <p className="lq-col-title">{r.label}</p>
            <p className="lq-col-span">
              {r.from && r.to
                ? `${fmtDay(r.from, tz)} → ${fmtDay(r.to, tz)}`
                : 'Fechas por confirmar'}
            </p>
          </header>
          <div className="lq-col-list">
            {r.series.map((s) => (
              <SeriesCard key={s.key} series={s} tz={tz} />
            ))}
            {r.round === 'final' ? <ChampionCell champion={champion} /> : null}
          </div>
        </section>
      ))}
    </div>
  );
}

function ChampionCell({ champion }: { champion: LiguillaSide | null }) {
  return (
    <div className={['lq-champ', champion ? 'is-set' : ''].join(' ')} data-testid="liguilla-champion">
      <p className="lq-champ-kicker">Campeón Apertura 2026</p>
      {champion?.abbr ? (
        <div className="lq-champ-club">
          <ClubLogo
            abbr={champion.abbr}
            clubId={ligaMxClubIdFromAbbr(champion.abbr)}
            name={champion.name}
            size="lg"
          />
          <p className="lq-champ-name">{champion.name}</p>
        </div>
      ) : (
        <p className="lq-champ-tbd">Por definir</p>
      )}
    </div>
  );
}

function TeamBlock({
  f,
  side,
  board,
}: {
  f: Fixture;
  side: 'home' | 'away';
  board: Pick<LiguillaBoard, 'seeds'> | null;
}) {
  const t = f[side];
  const abbr = sideAbbr(f, side);
  const seed = seedOf(board, abbr);
  return (
    <span className={`lq-match-team is-${side}`}>
      <ClubLogo
        abbr={abbr ?? undefined}
        clubId={abbr ? ligaMxClubIdFromAbbr(abbr) : undefined}
        name={t.name}
        logoUrl={t.logo}
        size="lg"
      />
      <span className="lq-match-team-copy">
        <span className="lq-match-team-abbr">{abbr ?? '—'}</span>
        <span className="lq-match-team-name">
          {t.name}
          {seed ? <span className="lq-match-seed"> · {seed}º</span> : null}
        </span>
      </span>
    </span>
  );
}

/** "Vuelta: sáb 28 nov · 7:00 p.m." on an ida card; "Ida: TOL 2–1 ATS" on a vuelta card. */
function otherLegLine(f: Fixture, series: LiguillaSeries | null, tz: string): string | null {
  if (!series) return null;
  const other = series.ida?.id === f.id ? series.vuelta : series.ida;
  if (!other) return null;
  const label = other === series.ida ? 'Ida' : 'Vuelta';
  if (other.state === 'post' || other.state === 'in') {
    return `${label}: ${other.home.abbreviation} ${other.home.score ?? 0}–${other.away.score ?? 0} ${other.away.abbreviation}`;
  }
  return `${label}: ${fmtDay(other.date, tz)} · ${formatKickoffTime(other.date, tz)}`;
}

export function LiguillaMatchCard({
  f,
  series,
  board,
  tz,
}: {
  f: Fixture;
  series: LiguillaSeries | null;
  board: Pick<LiguillaBoard, 'seeds'> | null;
  tz: string;
}) {
  const live = f.state === 'in';
  const done = f.state === 'post';
  const tag = liguillaFixtureTag(f);
  const d = f.dondeVer;
  const hasTv = Boolean(d?.confirmed && (d.mxChannels?.length || d.usChannels?.length));
  const other = otherLegLine(f, series, tz);
  const showSeries = series && series.status !== 'pre' && series.status !== 'tbd';

  return (
    <li className="lq-match-item">
      <PartidoLink
        href={`/partido/liga-mx/${f.id}`}
        data-testid={`liguilla-match-${f.id}`}
        className={['lq-match', live ? 'is-live' : '', done ? 'is-done' : ''].filter(Boolean).join(' ')}
      >
        <div className="lq-match-rail">
          <span className="lq-match-tag">{tag}</span>
          <span className="lq-match-stamp">
            {live ? <span className="hoy-live-dot" aria-hidden /> : null}
            {legStamp(f, tz)}
          </span>
        </div>

        <div className="lq-match-board">
          <TeamBlock f={f} side="home" board={board} />
          <span className="lq-match-score">
            {live || done ? (
              <>
                <span>{f.home.score ?? 0}</span>
                <span className="lq-match-dash">–</span>
                <span>{f.away.score ?? 0}</span>
              </>
            ) : (
              <span className="lq-match-vs">VS</span>
            )}
          </span>
          <TeamBlock f={f} side="away" board={board} />
        </div>

        {f.penalties ? (
          <p className="lq-match-pens">
            Penales {f.penalties.home}–{f.penalties.away}
          </p>
        ) : null}

        <div className="lq-match-meta">
          {showSeries ? (
            <p className="lq-match-series">{series!.verdict}</p>
          ) : series ? (
            <p className="lq-match-series is-quiet">{series.verdict}</p>
          ) : null}
          {other ? <p className="lq-match-other">{other}</p> : null}
          {f.venue ? (
            <p className="lq-match-venue">
              {f.venue}
              {f.city ? ` · ${f.city}` : ''}
            </p>
          ) : null}
        </div>

        <div className="lq-match-tv">
          {hasTv ? (
            <DondeVerAir mx={d?.mxChannels} us={d?.usChannels} mxLabel={d?.mx} usLabel={d?.us} />
          ) : (
            <p className="dv-pending">Canales por confirmar · MX ↔ US</p>
          )}
        </div>
      </PartidoLink>
    </li>
  );
}
