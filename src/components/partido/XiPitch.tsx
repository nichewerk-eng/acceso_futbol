'use client';

import { useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { xiConfirmed, xiKit, xiPins } from '@/lib/share/xiShare';
import type { LineupPlayer, TeamLineup } from '@/lib/sports/types';

function PitchLines() {
  return (
    <svg
      className="xi-pitch-lines"
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      aria-hidden
      pointerEvents="none"
    >
      <rect x="3" y="3" width="94" height="134" fill="none" />
      <line x1="3" y1="70" x2="97" y2="70" />
      <rect x="40" y="61" width="20" height="18" fill="none" />
      <rect x="22" y="3" width="56" height="20" fill="none" />
      <rect x="34" y="3" width="32" height="9" fill="none" />
      <rect x="22" y="117" width="56" height="20" fill="none" />
      <rect x="34" y="128" width="32" height="9" fill="none" />
      <rect className="xi-pitch-dot" x="49" y="69" width="2" height="2" />
      <rect className="xi-pitch-dot" x="49" y="16" width="2" height="2" />
      <rect className="xi-pitch-dot" x="49" y="122" width="2" height="2" />
    </svg>
  );
}

function BitSprite({ player }: { player: LineupPlayer }) {
  return (
    <span className="xi-bit" aria-hidden>
      {player.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.photo}
          alt=""
          className="xi-bit-face"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="xi-bit-face is-empty" />
      )}
      <span className="xi-bit-torso">
        {player.jersey != null ? player.jersey : '·'}
      </span>
      <span className="xi-bit-shorts" />
      <span className="xi-bit-boots">
        <i />
        <i />
      </span>
    </span>
  );
}

function playerLabel(player: LineupPlayer): string {
  return player.jersey != null ? `${player.jersey} · ${player.name}` : player.name;
}

export function XiPitch({ team }: { team: TeamLineup }) {
  const pins = xiPins(team);
  const confirmed = xiConfirmed(team);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = pins.find((pin) => pin.player.id === activeId) ?? null;

  return (
    <div className="xi-pitch" data-testid={`xi-pitch-${team.side}`}>
      <div className="xi-pitch-head">
        <ClubLogo abbr={team.abbreviation} name={team.teamName} size="sm" />
        <p className="xi-pitch-title">{team.abbreviation}</p>
        <p className="af-tele">
          {team.side === 'home' ? '1P' : '2P'}
          {' · '}
          {team.formation ? `${team.formation} · ` : ''}
          {confirmed ? 'XI confirmado' : 'XI parcial'}
        </p>
      </div>
      <div
        className="xi-pitch-board"
        onPointerLeave={() => setActiveId(null)}
      >
        <PitchLines />
        {pins.map((pin) => {
          const label = playerLabel(pin.player);
          const on = activeId === pin.player.id;
          const kit = xiKit(team.abbreviation, pin.player.position);
          return (
            <button
              key={pin.player.id}
              type="button"
              className={on ? 'xi-pin is-on' : 'xi-pin'}
              data-pos={pin.player.position}
              style={{
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                ['--xi-shirt' as string]: kit.shirt,
                ['--xi-number' as string]: kit.number,
                ['--xi-shorts' as string]: kit.shorts,
              }}
              aria-label={label}
              aria-pressed={on}
              onPointerEnter={() => setActiveId(pin.player.id)}
              onFocus={() => setActiveId(pin.player.id)}
              onClick={() => setActiveId(pin.player.id)}
            >
              <BitSprite player={pin.player} />
            </button>
          );
        })}
      </div>
      <p className={active ? 'xi-pitch-select is-on' : 'xi-pitch-select'}>
        {active ? playerLabel(active.player) : 'Pasa el cursor · el nombre'}
      </p>
    </div>
  );
}
