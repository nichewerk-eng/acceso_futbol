'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { passDuration } from '@/components/partido/XiBall';
import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import type { TotwPlayer } from '@/lib/sports/totw';

type Spot = { x: number; y: number };

type Pin = Spot & { player: TotwPlayer };

/** Pitch slots: 1 GK, 2 RB → 5 LB, 7/11 right, 8/10 left. */
const SPOTS_433: Record<number, Spot> = {
  1: { x: 50, y: 86 },
  2: { x: 88, y: 68 },
  3: { x: 67, y: 70 },
  4: { x: 33, y: 70 },
  5: { x: 12, y: 68 },
  6: { x: 50, y: 48 },
  7: { x: 82, y: 46 },
  8: { x: 18, y: 46 },
  9: { x: 50, y: 18 },
  10: { x: 18, y: 20 },
  11: { x: 82, y: 20 },
};

const SPOTS_442: Record<number, Spot> = {
  1: { x: 50, y: 86 },
  2: { x: 88, y: 68 },
  3: { x: 67, y: 70 },
  4: { x: 33, y: 70 },
  5: { x: 12, y: 68 },
  6: { x: 88, y: 46 },
  7: { x: 66, y: 48 },
  8: { x: 34, y: 48 },
  9: { x: 12, y: 46 },
  10: { x: 34, y: 18 },
  11: { x: 66, y: 18 },
};

const SPOTS_4231: Record<number, Spot> = {
  1: { x: 50, y: 86 },
  2: { x: 88, y: 68 },
  3: { x: 67, y: 70 },
  4: { x: 33, y: 70 },
  5: { x: 12, y: 68 },
  6: { x: 64, y: 50 },
  7: { x: 36, y: 50 },
  8: { x: 86, y: 32 },
  9: { x: 50, y: 34 },
  10: { x: 14, y: 32 },
  11: { x: 50, y: 14 },
};

const SPOTS_352: Record<number, Spot> = {
  1: { x: 50, y: 86 },
  2: { x: 76, y: 70 },
  3: { x: 50, y: 72 },
  4: { x: 24, y: 70 },
  5: { x: 90, y: 48 },
  6: { x: 68, y: 50 },
  7: { x: 50, y: 46 },
  8: { x: 32, y: 50 },
  9: { x: 10, y: 48 },
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
      className="once-pitch-lines"
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      aria-hidden
    >
      <rect x="3.2" y="3.2" width="93.6" height="133.6" />
      <line x1="3.2" y1="70" x2="96.8" y2="70" />
      <circle cx="50" cy="70" r="11.4" />
      <circle className="once-pitch-spot" cx="50" cy="70" r="0.85" />
      <rect x="21.5" y="3.2" width="57" height="18.5" />
      <rect x="34.5" y="3.2" width="31" height="8.2" />
      <circle className="once-pitch-spot" cx="50" cy="16.4" r="0.7" />
      <path d="M 38.6 21.7 A 11.4 11.4 0 0 0 61.4 21.7" />
      <rect x="21.5" y="118.3" width="57" height="18.5" />
      <rect x="34.5" y="128.6" width="31" height="8.2" />
      <circle className="once-pitch-spot" cx="50" cy="123.6" r="0.7" />
      <path d="M 38.6 118.3 A 11.4 11.4 0 0 1 61.4 118.3" />
    </svg>
  );
}

function formatRating(n: number): string {
  return n.toFixed(1);
}

function faceInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function OnceFace({ photo, name }: { photo?: string; name: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [photo]);
  const showPhoto = Boolean(photo) && !broken;
  if (showPhoto && photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        className="once-disc-photo"
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="once-disc-photo is-empty" aria-hidden>
      {faceInitials(name)}
    </span>
  );
}

function OnceBall({
  pin,
  passMs,
  passKey,
}: {
  pin: Spot;
  passMs: number;
  passKey: number;
}) {
  return (
    <span
      key={passKey}
      className="once-ball"
      aria-hidden
      style={{
        left: `${pin.x}%`,
        top: `${pin.y}%`,
        ['--once-pass-ms' as string]: `${passMs}ms`,
      }}
    />
  );
}

function starterGkId(pins: Pin[]): string | null {
  return pins.find((p) => p.player.slot === 1)?.player.id ?? pins[0]?.player.id ?? null;
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduce;
}

export function OncePitch({
  players,
  formation,
  mvpId,
  selectedId,
  onSelect,
}: {
  players: TotwPlayer[];
  formation: string;
  mvpId?: string | null;
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
  const reduceMotion = usePrefersReducedMotion();
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

  function runPass(from: Pin | undefined, to: Pin) {
    const ms = reduceMotion || !from ? 0 : passDuration(from, to);
    setPassMs(ms);
    setBallId(to.player.id);
    setPassKey((n) => n + 1);
  }

  function passTo(pin: Pin) {
    if (pin.player.id !== ballId) {
      runPass(
        pins.find((p) => p.player.id === ballId),
        pin
      );
    }
    onSelect?.(pin.player.id);
  }

  useEffect(() => {
    if (!selectedId) return;
    const pin = pins.find((p) => p.player.id === selectedId);
    if (!pin || pin.player.id === ballId) return;
    const from = pins.find((p) => p.player.id === ballId);
    runPass(from, pin);
    // Kickoff / ranking sync only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, pins, ballId, reduceMotion]);

  return (
    <div className="once-pitch" data-testid="once-pitch">
      <div className="once-pitch-board">
        <div className="once-pitch-field" aria-hidden>
          <PitchLines />
          {formation ? <p className="once-pitch-mark">{formation}</p> : null}
        </div>

        {pins.map((pin) => {
          const totw = pin.player;
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
              <span className="once-disc" aria-hidden>
                <OnceFace photo={totw.photo} name={totw.name} />
              </span>
              <span className="once-pin-meta">
                {mvp ? <span className="once-pin-figura">Figura</span> : null}
                <span className="once-pin-who">
                  <ClubLogo
                    abbr={totw.teamAbbr}
                    clubId={clubIdentityFromAbbr(totw.teamAbbr)?.id}
                    name={totw.teamName}
                    size="xs"
                    className="once-pin-crest"
                  />
                  <span className="once-pin-name">{totw.shortName}</span>
                </span>
                <span className="once-pin-rate">{formatRating(totw.rating)}</span>
              </span>
            </button>
          );
        })}
        {ballPin ? <OnceBall pin={ballPin} passMs={passMs} passKey={passKey} /> : null}
      </div>
    </div>
  );
}

export function OnceFicha({
  player,
  mvpId,
}: {
  player: TotwPlayer | null;
  mvpId?: string | null;
}) {
  return (
    <div className={player ? 'once-tip is-on' : 'once-tip'} data-testid="once-tip">
      {player ? (
        <>
          <p className="once-tip-kicker">
            {player.teamAbbr} · {formatRating(player.rating)}
            {mvpId === player.id ? ' · FIGURA' : ''}
          </p>
          <p className="once-tip-name">{player.name}</p>
          {player.acceso ? (
            <p className="once-tip-split" data-testid="once-tip-index">
              Partido {formatRating(player.acceso.sm)} · equipo {formatRating(player.acceso.team)}
            </p>
          ) : null}
          {player.why ? (
            <p className="once-tip-why" data-testid="once-tip-why">
              {player.why}
            </p>
          ) : null}
          {player.fixtureId ? (
            <Link
              href={`/partido/liga-mx/${player.fixtureId}`}
              className="once-tip-link"
              data-testid="once-tip-match"
            >
              Ver partido
            </Link>
          ) : null}
        </>
      ) : (
        <p>Toca un jugador del once para ver por qué está aquí.</p>
      )}
    </div>
  );
}
