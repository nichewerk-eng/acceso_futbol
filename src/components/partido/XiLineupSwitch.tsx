'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { XiPitch } from '@/components/partido/XiPitch';
import type { TeamLineup } from '@/lib/sports/types';

type Props = {
  teams: TeamLineup[];
  /** Optional list / banca under the selected pitch. */
  list?: (team: TeamLineup) => ReactNode;
};

/** One pitch at a time — switch home/away so mobile doesn’t stack two XIs. */
export function XiLineupSwitch({ teams, list }: Props) {
  const [side, setSide] = useState<'home' | 'away'>(() => teams[0]?.side ?? 'home');

  useEffect(() => {
    if (!teams.some((t) => t.side === side)) {
      setSide(teams[0]?.side ?? 'home');
    }
  }, [teams, side]);

  const team = teams.find((t) => t.side === side) ?? teams[0];
  if (!team) return null;

  return (
    <div className="xi-lineup-switch" data-testid="xi-lineup-switch">
      <div className="xi-side-tabs" role="tablist" aria-label="Alineación por equipo">
        {teams.map((t) => {
          const on = t.side === team.side;
          return (
            <button
              key={t.side}
              type="button"
              role="tab"
              aria-selected={on}
              data-testid={`xi-side-tab-${t.side}`}
              className={['xi-side-tab', on ? 'is-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setSide(t.side)}
            >
              <span className="xi-side-tab-club">
                <ClubLogo abbr={t.abbreviation} name={t.teamName} size="sm" />
                <span className="xi-side-tab-abbr">{t.abbreviation}</span>
                {t.formation ? (
                  <span className="xi-side-tab-meta">{t.formation}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <XiPitch team={team} />
      {list ? <div className="xi-lineup-switch-list">{list(team)}</div> : null}
    </div>
  );
}
