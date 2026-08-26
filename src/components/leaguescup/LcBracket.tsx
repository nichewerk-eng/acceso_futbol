'use client';

import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { LeaguesCupMark } from '@/components/brand/LeaguesCupMark';
import { LEAGUES_CUP_KNOCKOUT, type LcKnockoutSlot } from '@/config/leaguesCup2026';
import { lcKnockoutWinnerSide } from '@/lib/sports/leaguesCupBoard';
import type { Fixture, TeamRef } from '@/lib/sports/types';

type Tone = 'qf' | 'sf' | 'final' | 'third';

function byId(fixtures: Fixture[]) {
  return new Map(fixtures.map((f) => [f.id, f]));
}

function slotMap() {
  return new Map(LEAGUES_CUP_KNOCKOUT.map((s) => [s.id, s]));
}

function isSet(abbr?: string | null) {
  if (!abbr) return false;
  const a = abbr.toUpperCase();
  return a !== 'TBD' && a !== 'TBC';
}

function metaFor(slot: LcKnockoutSlot, fixture?: Fixture): string {
  if (fixture?.state === 'in') {
    if (fixture.clock === 'HT' || /descanso/i.test(fixture.statusLabel || '')) return 'HT';
    return fixture.clock || 'En vivo';
  }
  if (fixture?.state === 'post') return 'FT';
  return slot.boardDateLabel;
}

export function LcBracket({
  fixtures,
  isMine,
}: {
  fixtures: Fixture[];
  isMine?: (f: Fixture) => boolean;
}) {
  const fx = byId(fixtures);
  const slots = slotMap();
  const live = fixtures.some((f) => f.state === 'in');
  const advanced = fixtures.some(
    (f) => f.id.startsWith('lc-sf') && (isSet(f.home.abbreviation) || isSet(f.away.abbreviation))
  );

  const cell = (id: string, tone: Tone, area: string, align: 'left' | 'right' | 'center') => {
    const slot = slots.get(id);
    const f = fx.get(id);
    if (!slot) return null;
    return (
      <div className={`lc-br-cell lc-br-cell-${align}`} style={{ gridArea: area }}>
        <BracketMatch
          slot={slot}
          fixture={f}
          tone={tone}
          mine={f ? Boolean(isMine?.(f)) : false}
        />
      </div>
    );
  };

  return (
    <div className="lc-bracket">
      <div className="lc-bracket-scroll">
        <div className="lc-br-heads" aria-hidden>
          <span>Cuartos</span>
          <span />
          <span>Semis</span>
          <span />
          <span>Final</span>
          <span />
          <span>Semis</span>
          <span />
          <span>Cuartos</span>
        </div>
        <div className="lc-br-tree">
          <p className="lc-br-m-label" style={{ gridArea: 'lab-a' }}>
            Cuartos · 25–26 ago
          </p>
          {cell('lc-qf-3', 'qf', 'qf-l1', 'right')}
          {cell('lc-qf-2', 'qf', 'qf-l2', 'right')}
          <div className="lc-br-join lc-br-join-l" style={{ gridArea: 'join-l' }} />
          {cell('lc-sf-1', 'sf', 'sf-l', 'center')}
          <div className="lc-br-join lc-br-join-ml" style={{ gridArea: 'join-ml' }} />
          <p className="lc-br-m-label" style={{ gridArea: 'lab-b' }}>
            Cuartos · 25–26 ago
          </p>
          {cell('lc-qf-1', 'qf', 'qf-r1', 'left')}
          {cell('lc-qf-4', 'qf', 'qf-r2', 'left')}
          <div className="lc-br-join lc-br-join-r" style={{ gridArea: 'join-r' }} />
          {cell('lc-sf-2', 'sf', 'sf-r', 'center')}
          <div className="lc-br-join lc-br-join-mr" style={{ gridArea: 'join-mr' }} />
          <p className="lc-br-m-label lc-br-m-label-final" style={{ gridArea: 'lab-f' }}>
            6 sep
          </p>
          {cell('lc-final', 'final', 'final', 'center')}
          {cell('lc-third', 'third', 'third', 'center')}
        </div>
      </div>
      <p className="lc-bracket-note">
        {live
          ? 'Cuadro en vivo · se actualiza con el marcador'
          : advanced
            ? 'Ganadores avanzan al siguiente cruce · semis 1–2 sep · final 6 sep'
            : 'Emparejamientos oficiales · sedes y horarios por anunciar'}
      </p>
    </div>
  );
}

function BracketMatch({
  slot,
  fixture,
  tone,
  mine,
}: {
  slot: LcKnockoutSlot;
  fixture?: Fixture;
  tone: Tone;
  mine: boolean;
}) {
  const home = fixture?.home;
  const away = fixture?.away;
  const homeAbbr = home?.abbreviation ?? slot.home;
  const awayAbbr = away?.abbreviation ?? slot.away;
  const homeSet = isSet(homeAbbr);
  const awaySet = isSet(awayAbbr);
  const empty = !homeSet && !awaySet;
  const href = homeSet && awaySet ? `/partido/leagues-cup/${slot.id}` : null;
  const winner = fixture ? lcKnockoutWinnerSide(fixture) : null;
  const showScore = fixture?.state === 'in' || fixture?.state === 'post';
  const live = fixture?.state === 'in';

  const article = (
    <article
      className={[
        'lc-br-match',
        `lc-br-match-${tone}`,
        empty ? 'lc-br-match-empty' : '',
        live ? 'lc-br-match-live' : '',
        mine ? 'lc-br-match-mine' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={`lc-ko-${slot.id}`}
    >
      {empty && tone === 'final' ? (
        <LeaguesCupMark size="sm" surface="paper" className="lc-br-final-mark" />
      ) : null}
      <p className="lc-br-match-meta">
        {live ? <span className="hoy-live-dot mr-1.5" aria-hidden /> : null}
        {metaFor(slot, fixture)}
      </p>
      {empty ? null : (
        <>
          <BracketSide
            team={home}
            abbr={homeAbbr}
            label={homeSet ? home?.name || slot.homeLabel : slot.homeLabel}
            seed={!showScore ? slot.homeSeed : undefined}
            score={showScore ? home?.score : null}
            won={winner === 'home'}
            lost={winner === 'away'}
          />
          <BracketSide
            team={away}
            abbr={awayAbbr}
            label={awaySet ? away?.name || slot.awayLabel : slot.awayLabel}
            seed={!showScore ? slot.awaySeed : undefined}
            score={showScore ? away?.score : null}
            won={winner === 'away'}
            lost={winner === 'home'}
          />
        </>
      )}
    </article>
  );

  if (!href) return article;
  return (
    <Link href={href} className="lc-br-match-link">
      {article}
    </Link>
  );
}

function BracketSide({
  team,
  abbr,
  label,
  seed,
  score,
  won,
  lost,
}: {
  team?: TeamRef;
  abbr: string | null;
  label: string;
  seed?: string;
  score?: string | null;
  won?: boolean;
  lost?: boolean;
}) {
  const code = (abbr || team?.abbreviation || '').toUpperCase();
  const tbd = !isSet(code);
  return (
    <div
      className={['lc-br-side', won ? 'is-win' : '', lost ? 'is-lose' : '', tbd ? 'is-tbd' : '']
        .filter(Boolean)
        .join(' ')}
    >
      {tbd ? (
        <span className="lc-br-side-gap" aria-hidden />
      ) : (
        <ClubLogo
          abbr={code}
          clubId={team?.id}
          name={team?.name || label}
          logoUrl={team?.logo}
          size="xs"
        />
      )}
      <div className="lc-br-side-copy">
        <div className="min-w-0">
          <p className={tbd ? 'lc-br-abbr lc-br-abbr-tbd' : 'lc-br-abbr'}>{tbd ? '—' : code}</p>
          <p className="lc-br-name">{team?.name && !tbd ? team.name : label}</p>
        </div>
        {score != null && score !== '' ? (
          <p className="lc-br-score">{score}</p>
        ) : seed ? (
          <p className="lc-br-seed">{seed}</p>
        ) : null}
      </div>
    </div>
  );
}
