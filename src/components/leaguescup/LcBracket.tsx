'use client';

import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { LeaguesCupMark } from '@/components/brand/LeaguesCupMark';
import { LEAGUES_CUP_KNOCKOUT, type LcKnockoutSlot } from '@/config/leaguesCup2026';
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

export function LcBracket({
  fixtures,
  isMine,
}: {
  fixtures: Fixture[];
  isMine?: (f: Fixture) => boolean;
}) {
  const fx = byId(fixtures);
  const slots = slotMap();

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
        Emparejamientos oficiales · sedes y horarios por anunciar
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
  const homeSet = isSet(slot.home);
  const awaySet = isSet(slot.away);
  const empty = !homeSet && !awaySet;
  const href = homeSet && awaySet ? `/partido/leagues-cup/${slot.id}` : null;

  const article = (
    <article
      className={[
        'lc-br-match',
        `lc-br-match-${tone}`,
        empty ? 'lc-br-match-empty' : '',
        mine ? 'lc-br-match-mine' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={`lc-ko-${slot.id}`}
    >
      {empty && tone === 'final' ? (
        <LeaguesCupMark size="sm" surface="paper" className="lc-br-final-mark" />
      ) : null}
      <p className="lc-br-match-meta">{slot.boardDateLabel}</p>
      {empty ? null : (
        <>
          <BracketSide
            team={home}
            abbr={slot.home}
            label={slot.homeLabel}
            seed={slot.homeSeed}
          />
          <BracketSide
            team={away}
            abbr={slot.away}
            label={slot.awayLabel}
            seed={slot.awaySeed}
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
}: {
  team?: TeamRef;
  abbr: string | null;
  label: string;
  seed?: string;
}) {
  const code = (abbr || team?.abbreviation || '').toUpperCase();
  return (
    <div className="lc-br-side">
      <ClubLogo
        abbr={code}
        clubId={team?.id}
        name={team?.name || label}
        logoUrl={team?.logo}
        size="xs"
      />
      <div className="lc-br-side-copy">
        <div className="min-w-0">
          <p className="lc-br-abbr">{code}</p>
          <p className="lc-br-name">{team?.name || label}</p>
        </div>
        {seed ? <p className="lc-br-seed">{seed}</p> : null}
      </div>
    </div>
  );
}
