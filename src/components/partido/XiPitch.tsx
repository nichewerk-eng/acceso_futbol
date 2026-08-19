'use client';

import { useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { passDuration, XiBall } from '@/components/partido/XiBall';
import { xiConfirmed, xiKit, xiPins, type XiPin } from '@/lib/share/xiShare';
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

function starterGkId(pins: XiPin[]): string | null {
  return pins.find((p) => p.player.position === 'GK')?.player.id ?? pins[0]?.player.id ?? null;
}

export function XiPitch({ team }: { team: TeamLineup }) {
  const pins = xiPins(team);
  const confirmed = xiConfirmed(team);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [ballId, setBallId] = useState<string | null>(() => starterGkId(pins));
  const [passKey, setPassKey] = useState(0);
  const [passMs, setPassMs] = useState(0);

  const hover = pins.find((pin) => pin.player.id === hoverId) ?? null;
  const ballPin = pins.find((pin) => pin.player.id === ballId) ?? null;
  const shown = hover ?? ballPin;

  function passTo(pin: XiPin) {
    if (pin.player.id === ballId) return;
    const from = pins.find((p) => p.player.id === ballId);
    setPassMs(passDuration(from, pin));
    setBallId(pin.player.id);
    setPassKey((n) => n + 1);
  }

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
      <div className="xi-pitch-board" onPointerLeave={() => setHoverId(null)}>
        <PitchLines />
        {pins.map((pin) => {
          const label = playerLabel(pin.player);
          const hasBall = ballId === pin.player.id;
          const hot = hoverId === pin.player.id;
          const kit = xiKit(team.abbreviation, pin.player.position);
          return (
            <button
              key={pin.player.id}
              type="button"
              className={['xi-pin', hot ? 'is-hot' : '', hasBall ? 'is-on' : '']
                .filter(Boolean)
                .join(' ')}
              data-pos={pin.player.position}
              style={{
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                ['--xi-shirt' as string]: kit.shirt,
                ['--xi-number' as string]: kit.number,
                ['--xi-shorts' as string]: kit.shorts,
              }}
              aria-label={label}
              aria-pressed={hasBall}
              onPointerEnter={() => setHoverId(pin.player.id)}
              onFocus={() => setHoverId(pin.player.id)}
              onClick={() => passTo(pin)}
            >
              <BitSprite player={pin.player} />
            </button>
          );
        })}
        {ballPin ? <XiBall pin={ballPin} passMs={passMs} passKey={passKey} /> : null}
      </div>
      <p className={shown ? 'xi-pitch-select is-on' : 'xi-pitch-select'}>
        {hover
          ? playerLabel(hover.player)
          : ballPin
            ? `Balón · ${playerLabel(ballPin.player)}`
            : 'Click · pasa el balón'}
      </p>
    </div>
  );
}
