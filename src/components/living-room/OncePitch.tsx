'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { passDuration, XiBall } from '@/components/partido/XiBall';
import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import type { TotwPlayer } from '@/lib/sports/totw';

type Spot = { x: number; y: number };

type Pin = Spot & { player: TotwPlayer };

/** Pitch slots: 1 GK, 2 RB → 5 LB, 7/11 right, 8/10 left. */
const SPOTS_433: Record<number, Spot> = {
  1: { x: 50, y: 86 },
  2: { x: 90, y: 68 },
  3: { x: 68, y: 70 },
  4: { x: 32, y: 70 },
  5: { x: 10, y: 68 },
  6: { x: 50, y: 48 },
  7: { x: 84, y: 46 },
  8: { x: 16, y: 46 },
  9: { x: 50, y: 18 },
  10: { x: 16, y: 20 },
  11: { x: 84, y: 20 },
};

const SPOTS_442: Record<number, Spot> = {
  1: { x: 50, y: 86 },
  2: { x: 90, y: 68 },
  3: { x: 68, y: 70 },
  4: { x: 32, y: 70 },
  5: { x: 10, y: 68 },
  6: { x: 90, y: 46 },
  7: { x: 66, y: 48 },
  8: { x: 34, y: 48 },
  9: { x: 10, y: 46 },
  10: { x: 34, y: 18 },
  11: { x: 66, y: 18 },
};

const SPOTS_4231: Record<number, Spot> = {
  1: { x: 50, y: 86 },
  2: { x: 90, y: 68 },
  3: { x: 68, y: 70 },
  4: { x: 32, y: 70 },
  5: { x: 10, y: 68 },
  6: { x: 66, y: 50 },
  7: { x: 34, y: 50 },
  8: { x: 88, y: 32 },
  9: { x: 50, y: 34 },
  10: { x: 12, y: 32 },
  11: { x: 50, y: 14 },
};

const SPOTS_352: Record<number, Spot> = {
  1: { x: 50, y: 86 },
  2: { x: 78, y: 70 },
  3: { x: 50, y: 72 },
  4: { x: 22, y: 70 },
  5: { x: 92, y: 48 },
  6: { x: 68, y: 50 },
  7: { x: 50, y: 46 },
  8: { x: 32, y: 50 },
  9: { x: 8, y: 48 },
  10: { x: 34, y: 18 },
  11: { x: 66, y: 18 },
};

function spotsFor(formation: string): Record<number, Spot> {
  const f = formation.replace(/\s+/g, '');
  if (f === '4-4-2') return SPOTS_442;
  if (f === '4-2-3-1') return SPOTS_4231;
  if (f === '3-5-2') return SPOTS_352;
  return SPOTS_433;
}

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
    </svg>
  );
}

function formatRating(n: number): string {
  return n.toFixed(1);
}

function starterGkId(pins: Pin[]): string | null {
  return pins.find((p) => p.player.slot === 1)?.player.id ?? pins[0]?.player.id ?? null;
}

export function OncePitch({
  players,
  formation,
  mvpId,
  mineId,
  selectedId,
  onSelect,
}: {
  players: TotwPlayer[];
  formation: string;
  mvpId?: string | null;
  mineId?: string | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const spots = spotsFor(formation);
  const pins = useMemo<Pin[]>(
    () =>
      players.map((player) => {
        const spot = spots[player.slot] ?? { x: 50, y: 50 };
        return { ...spot, player };
      }),
    [players, spots]
  );

  const rosterKey = players.map((p) => p.id).join(',');
  const [ballId, setBallId] = useState<string | null>(() => starterGkId(pins));
  const [passKey, setPassKey] = useState(0);
  const [passMs, setPassMs] = useState(0);
  const [hopId, setHopId] = useState<string | null>(null);

  useEffect(() => {
    setBallId(starterGkId(pins));
    setPassKey(0);
    setPassMs(0);
    setHopId(null);
    // Roster identity only — don't reset the ball on every pin object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey]);

  useEffect(() => {
    if (passKey === 0 || !ballId) return;
    const t = window.setTimeout(() => {
      setHopId(null);
      requestAnimationFrame(() => setHopId(ballId));
    }, passMs);
    return () => window.clearTimeout(t);
  }, [passKey, ballId, passMs]);

  const ballPin = pins.find((pin) => pin.player.id === ballId) ?? null;
  const shown =
    (selectedId
      ? pins.find((pin) => pin.player.id === selectedId)?.player
      : null) ?? null;

  function passTo(pin: Pin) {
    if (pin.player.id !== ballId) {
      const from = pins.find((p) => p.player.id === ballId);
      setPassMs(passDuration(from, pin));
      setBallId(pin.player.id);
      setPassKey((n) => n + 1);
    }
    onSelect?.(pin.player.id);
  }

  useEffect(() => {
    if (!selectedId) return;
    const pin = pins.find((p) => p.player.id === selectedId);
    if (!pin || pin.player.id === ballId) return;
    const from = pins.find((p) => p.player.id === ballId);
    setPassMs(passDuration(from, pin));
    setBallId(pin.player.id);
    setPassKey((n) => n + 1);
  }, [selectedId, pins, ballId]);

  return (
    <div className="once-pitch" data-testid="once-pitch">
      <p className="once-pitch-form af-tele">{formation}</p>
      <div className="once-pitch-board">
        <PitchLines />
        {pins.map((pin) => {
          const totw = pin.player;
          const mine = mineId === totw.id;
          const mvp = mvpId === totw.id;
          const hasBall = ballId === totw.id;
          const hot = selectedId === totw.id;
          const gk = totw.position === 'GK' || totw.slot === 1;
          const hop = hopId === totw.id;
          return (
            <button
              key={totw.id}
              type="button"
              className={[
                'once-pin',
                gk ? 'is-gk' : '',
                mvp ? 'is-mvp' : '',
                mine ? 'is-mine' : '',
                hasBall ? 'is-on' : '',
                hot ? 'is-hot' : '',
                hop ? 'is-hop' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: `${pin.x}%`,
                top: `${pin.y}%`,
              }}
              aria-label={`${totw.name} · ${totw.teamAbbr} · ${formatRating(totw.rating)}`}
              aria-pressed={hasBall}
              data-testid={`once-pin-${totw.id}`}
              onClick={() => passTo(pin)}
              onAnimationEnd={(e) => {
                if (e.animationName === 'once-receive-hop') setHopId(null);
              }}
            >
              <span className="xi-bit" aria-hidden>
                {totw.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={totw.photo}
                    alt=""
                    className="xi-bit-face"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="xi-bit-face is-empty" />
                )}
                <span className="xi-bit-torso">{formatRating(totw.rating)}</span>
                <span className="xi-bit-shorts" />
              </span>
              <span className="once-pin-label">
                <ClubLogo
                  abbr={totw.teamAbbr}
                  clubId={clubIdentityFromAbbr(totw.teamAbbr)?.id}
                  name={totw.teamName}
                  size="xs"
                  className="once-pin-crest"
                />
                <span className="once-pin-name">{totw.shortName}</span>
              </span>
            </button>
          );
        })}
        {ballPin ? <XiBall pin={ballPin} passMs={passMs} passKey={passKey} /> : null}
      </div>
      <div
        className={shown ? 'once-tip is-on' : 'once-tip'}
        data-testid="once-tip"
      >
        {shown ? (
          <>
            <p className="once-tip-kicker">
              {shown.teamAbbr} · Acceso {formatRating(shown.rating)}
              {mvpId === shown.id ? ' · FIGURA' : ''}
            </p>
            <p className="once-tip-name">{shown.name}</p>
            {shown.acceso ? (
              <p className="once-tip-split" data-testid="once-tip-index">
                SM {formatRating(shown.acceso.sm)} · equipo {formatRating(shown.acceso.team)} ·
                Acceso {formatRating(shown.acceso.index)}
              </p>
            ) : null}
            {shown.why ? (
              <p className="once-tip-why" data-testid="once-tip-why">
                {shown.why}
              </p>
            ) : null}
            {shown.fixtureId ? (
              <Link
                href={`/partido/liga-mx/${shown.fixtureId}`}
                className="once-tip-link"
                data-testid="once-tip-match"
              >
                Ver partido
              </Link>
            ) : null}
          </>
        ) : (
          <p>Click · pasa el balón</p>
        )}
      </div>
    </div>
  );
}
