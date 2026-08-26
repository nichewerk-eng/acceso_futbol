'use client';

import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { HorariosHashOpen } from '@/components/horarios/HorariosHashOpen';
import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import {
  groupFixturesByDay,
  horarioDateIn,
  horarioScore,
  horarioStatus,
  horarioTimeIn,
} from '@/lib/horariosCopy';
import { fixtureChannelLabels } from '@/lib/dondeVerCopy';
import type { HorarioRound } from '@/lib/sports/horariosBoard';
import type { Fixture } from '@/lib/sports/types';

function tvLine(f: Fixture): string {
  const { mx, us } = fixtureChannelLabels(f);
  return [mx ? `MX ${mx}` : '', us ? `US ${us}` : ''].filter(Boolean).join(' · ');
}

function MatchCard({ f, tz }: { f: Fixture; tz: string }) {
  const score = horarioScore(f);
  const tv = tvLine(f);
  const live = f.state === 'in';
  const done = f.state === 'post';
  return (
    <li>
      <Link
        href={`/partido/liga-mx/${f.id}`}
        className={[
          'af-horarios-match',
          live ? 'is-live' : '',
          done ? 'is-done' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid={`horario-row-${f.id}`}
      >
        <p className="af-horarios-kick">
          {live ? (
            <>
              <span className="hoy-live-dot" aria-hidden />
              {f.clock && f.clock !== '0' ? f.clock : 'En vivo'}
            </>
          ) : done ? (
            'Final'
          ) : (
            `${horarioTimeIn(f.date, tz)} h`
          )}
        </p>
        <div className="af-horarios-pair">
          <span className="af-horarios-side">
            <ClubLogo abbr={f.home.abbreviation} name={f.home.name} size="sm" />
            <span>{f.home.name}</span>
          </span>
          <span className="af-horarios-vs">{score ?? 'vs'}</span>
          <span className="af-horarios-side af-horarios-side-away">
            <span>{f.away.name}</span>
            <ClubLogo abbr={f.away.abbreviation} name={f.away.name} size="sm" />
          </span>
        </div>
        <p className="af-horarios-status">{horarioStatus(f)}</p>
        <p className="af-horarios-tv">{tv || 'Canal por confirmar'}</p>
      </Link>
    </li>
  );
}

function DayBlock({
  label,
  fixtures,
  tz,
}: {
  label: string;
  fixtures: Fixture[];
  tz: string;
}) {
  return (
    <div className="af-horarios-day">
      <h3>{label}</h3>
      <ul>
        {fixtures.map((f) => (
          <MatchCard key={f.id} f={f} tz={tz} />
        ))}
      </ul>
    </div>
  );
}

function RoundBlock({
  round,
  open,
  tz,
}: {
  round: HorarioRound;
  open: boolean;
  tz: string;
}) {
  const first = round.fixtures[0];
  const last = round.fixtures[round.fixtures.length - 1];
  const span =
    first && last
      ? `${horarioDateIn(first.date, tz)} → ${horarioDateIn(last.date, tz)}`
      : '';
  const live = round.fixtures.some((f) => f.state === 'in');
  const remaining = round.fixtures.filter((f) => f.state !== 'post').length;
  const note = live
    ? `${remaining} en juego o por jugar`
    : remaining
      ? `${remaining} por jugar`
      : 'Sellada';
  const days = groupFixturesByDay(round.fixtures, tz);

  return (
    <section
      id={`jornada-${round.number}`}
      className={open ? 'af-horarios-round is-open' : 'af-horarios-round'}
      data-testid={`horario-jornada-${round.number}`}
    >
      <details open={open || undefined}>
        <summary>
          <span className="af-horarios-round-kicker">
            {live ? (
              <>
                <span className="hoy-live-dot" aria-hidden /> En curso
              </>
            ) : open ? (
              'Próxima'
            ) : (
              note
            )}
          </span>
          <span className="af-horarios-round-title">{round.label}</span>
          <span className="af-horarios-round-span">
            {span ? `${span} · ` : ''}
            {round.fixtures.length} partidos
          </span>
        </summary>
        <h2 className="sr-only">{round.label} — Horarios Liga MX</h2>
        <div className="af-horarios-days">
          {days.map((day) => (
            <DayBlock key={day.key} label={day.label} fixtures={day.fixtures} tz={tz} />
          ))}
        </div>
      </details>
    </section>
  );
}

export function HorariosCalendar({
  focus,
  rounds,
}: {
  focus: HorarioRound[];
  rounds: HorarioRound[];
}) {
  const tz = useDeviceTimeZone();
  const focusNums = new Set(focus.map((r) => r.number));

  return (
    <div className="af-horarios">
      <HorariosHashOpen />
      <nav className="af-horarios-jump" aria-label="Jornadas del Apertura 2026">
        <p className="af-tele">Saltar a jornada · horario en tu zona</p>
        <ol>
          {rounds.map((r) => (
            <li key={r.number}>
              <a
                href={`#jornada-${r.number}`}
                className={focusNums.has(r.number) ? 'is-now' : undefined}
              >
                J{r.number}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="af-horarios-full">
        {rounds.map((round) => (
          <RoundBlock
            key={round.number}
            round={round}
            open={focusNums.has(round.number)}
            tz={tz}
          />
        ))}
      </div>
    </div>
  );
}
