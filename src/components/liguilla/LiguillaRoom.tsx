'use client';

import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { DondeVerAir } from '@/components/living-room/DondeVerAir';
import { ligaMxClubIdFromAbbr } from '@/config/ligaMxLogos';
import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import { useLiguillaBoard } from '@/lib/client/useLiguillaBoard';
import { LIGUILLA_RULES } from '@/lib/liguillaCopy';
import { formatKickoffTime } from '@/lib/localTime';
import {
  legLabel,
  seriesForFixture,
  type LiguillaBoard,
  type LiguillaRoundBoard,
} from '@/lib/sports/liguilla';
import type { LiguillaPayload } from '@/lib/sports/liguillaBoard';
import type { Fixture } from '@/lib/sports/types';
import {
  fmtDay,
  fmtDayLong,
  legStamp,
  LiguillaBracket,
  LiguillaMatchCard,
} from './LiguillaParts';

const STEP_NOTE: Record<LiguillaRoundBoard['state'], string> = {
  pending: 'Por jugar',
  active: 'En curso',
  done: 'Sellada',
};

function dayKeyIn(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });
}

function RoundSteps({ board, tz }: { board: LiguillaBoard; tz: string }) {
  return (
    <ol className="lq-steps" aria-label="Fases de la Liguilla">
      {board.rounds.map((r) => (
        <li
          key={r.round}
          className={['lq-step', `is-${r.state}`, r.round === board.current ? 'is-now' : '']
            .filter(Boolean)
            .join(' ')}
        >
          <a href={`#${r.round}`}>
            <span className="lq-step-label">{r.label}</span>
            <span className="lq-step-note">
              {r.round === board.current && r.state !== 'done' ? 'Ahora · ' : ''}
              {STEP_NOTE[r.state]}
              {r.from ? ` · ${fmtDay(r.from, tz)}` : ''}
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}

function TodaySlate({ board, tz }: { board: LiguillaBoard; tz: string }) {
  const isToday = board.today.length > 0;
  const games = (isToday ? board.today : board.next)
    .slice()
    .sort((a, b) => Number(b.state === 'in') - Number(a.state === 'in') || +new Date(a.date) - +new Date(b.date));
  const first = games[0];
  const title = isToday ? 'Juegos de hoy' : 'Próximos juegos';
  const when = first ? fmtDayLong(first.date, tz) : '';

  return (
    <section className="lq-section" id="hoy" data-testid="liguilla-hoy">
      <div className="lq-section-head">
        <div>
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>://HOY
          </p>
          <h2 className="lq-h2">
            {title}
            {when ? <span className="lq-h2-sub"> · {when}</span> : null}
          </h2>
        </div>
        <p className="af-tele">
          {games.length} partido{games.length === 1 ? '' : 's'} · horario en tu zona
        </p>
      </div>
      {games.length ? (
        <ul className="lq-match-list">
          {games.map((f) => (
            <LiguillaMatchCard key={f.id} f={f} series={seriesForFixture(board, f.id)} board={board} tz={tz} />
          ))}
        </ul>
      ) : (
        <p className="lq-empty">
          {board.champion
            ? `${board.champion.name} es campeón del Apertura 2026.`
            : 'Sin partidos programados todavía. Las fechas de la siguiente ronda salen al cerrar la actual.'}
        </p>
      )}
    </section>
  );
}

function CalendarRow({ f, tz }: { f: Fixture; tz: string }) {
  const live = f.state === 'in';
  const done = f.state === 'post';
  const d = f.dondeVer;
  const hasTv = Boolean(d?.confirmed && (d.mxChannels?.length || d.usChannels?.length));
  const leg = legLabel(f.leg);
  const tbd = Boolean(f.home.placeholder || f.away.placeholder);
  return (
    <Link
      href={`/partido/liga-mx/${f.id}`}
      className={['lq-cal-row', live ? 'is-live' : '', done ? 'is-done' : ''].filter(Boolean).join(' ')}
      data-testid={`liguilla-cal-${f.id}`}
    >
      <p className="lq-cal-kick">
        {live ? <span className="hoy-live-dot" aria-hidden /> : null}
        {done || live ? legStamp(f, tz) : tbd ? 'Por confirmar' : formatKickoffTime(f.date, tz)}
        {leg ? <span className="lq-cal-leg">{leg}</span> : null}
      </p>
      <div className="lq-cal-pair">
        <span className="lq-cal-side">
          <ClubLogo
            abbr={f.home.placeholder ? undefined : f.home.abbreviation}
            clubId={ligaMxClubIdFromAbbr(f.home.abbreviation)}
            name={f.home.name}
            size="sm"
          />
          <span>{f.home.placeholder ? f.home.name : f.home.abbreviation}</span>
        </span>
        <span className="lq-cal-mid">
          {live || done ? `${f.home.score ?? 0}–${f.away.score ?? 0}` : 'vs'}
        </span>
        <span className="lq-cal-side is-away">
          <span>{f.away.placeholder ? f.away.name : f.away.abbreviation}</span>
          <ClubLogo
            abbr={f.away.placeholder ? undefined : f.away.abbreviation}
            clubId={ligaMxClubIdFromAbbr(f.away.abbreviation)}
            name={f.away.name}
            size="sm"
          />
        </span>
      </div>
      <p className="lq-cal-venue">{f.venue ?? 'Sede por confirmar'}</p>
      <div className="lq-cal-tv">
        {hasTv ? (
          <DondeVerAir mx={d?.mxChannels} us={d?.usChannels} mxLabel={d?.mx} usLabel={d?.us} />
        ) : (
          <p className="dv-pending">Canales por confirmar</p>
        )}
      </div>
    </Link>
  );
}

function CalendarRound({ round, tz }: { round: LiguillaRoundBoard; tz: string }) {
  const days = new Map<string, Fixture[]>();
  for (const f of round.fixtures) {
    const k = dayKeyIn(f.date, tz);
    days.set(k, [...(days.get(k) ?? []), f]);
  }
  return (
    <section className={`lq-cal-round is-${round.state}`} id={round.round}>
      <header className="lq-cal-round-head">
        <h3>{round.label}</h3>
        <p className="af-tele">
          {round.fixtures.length
            ? `${round.fixtures.length} partidos · ${STEP_NOTE[round.state]}`
            : 'Fechas y horarios por confirmar'}
        </p>
      </header>
      {[...days.entries()].map(([k, list]) => (
        <div key={k} className="lq-cal-day">
          <p className="lq-cal-day-label">{fmtDayLong(list[0]!.date, tz)}</p>
          <div className="lq-cal-list">
            {list.map((f) => (
              <CalendarRow key={f.id} f={f} tz={tz} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Seeds({ board }: { board: LiguillaBoard }) {
  const out = new Set<string>();
  for (const r of board.rounds) {
    for (const s of r.series) {
      if (s.winner === 'high' && s.low.abbr) out.add(s.low.abbr);
      if (s.winner === 'low' && s.high.abbr) out.add(s.high.abbr);
    }
  }
  return (
    <ol className="lq-seeds" data-testid="liguilla-seeds">
      {board.seeds.map((s) => {
        const slug = ligaMxClubIdFromAbbr(s.abbr);
        const body = (
          <>
            <span className="lq-seed-n">{s.seed}</span>
            <ClubLogo abbr={s.abbr} clubId={slug} name={s.name} size="sm" />
            <span className="lq-seed-name">{s.name}</span>
            <span className="lq-seed-pts">{s.pts} pts</span>
          </>
        );
        return (
          <li key={s.abbr} className={out.has(s.abbr) ? 'lq-seed is-out' : 'lq-seed'}>
            {slug ? (
              <Link href={`/club/${slug}`} className="lq-seed-row">
                {body}
              </Link>
            ) : (
              <span className="lq-seed-row">{body}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function LiguillaRoom({ initial }: { initial: LiguillaPayload | null }) {
  const board = useLiguillaBoard(initial);
  const tz = useDeviceTimeZone();

  if (!board) {
    return (
      <p className="af-tele py-16" data-testid="liguilla-loading">
        Cargando Liguilla…
      </p>
    );
  }

  const current = board.rounds.find((r) => r.round === board.current);

  return (
    <div className="lq-room" data-testid="page-liguilla">
      <header className="lq-hero">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>://LIGUILLA
        </p>
        <h1 className="lq-h1">Liguilla Liga MX</h1>
        <p className="lq-lead">
          Apertura 2026 ·{' '}
          {board.champion
            ? `${board.champion.name} campeón`
            : current
              ? `${current.label}${current.state === 'active' ? ' en curso' : ''}`
              : ''}
          . Ida y vuelta, marcador global y el canal de cada partido en México y Estados Unidos.
        </p>
        <RoundSteps board={board} tz={tz} />
      </header>

      <TodaySlate board={board} tz={tz} />

      <section className="lq-section" id="cuadro">
        <div className="lq-section-head">
          <div>
            <p className="af-tele text-foreground">
              <span className="text-signal">AF</span>://CUADRO
            </p>
            <h2 className="lq-h2">Cuadro de la Liguilla</h2>
          </div>
          <p className="af-tele">Semis y Final se reacomodan por posición en la tabla</p>
        </div>
        <LiguillaBracket rounds={board.rounds} champion={board.champion} tz={tz} />
      </section>

      <section className="lq-section" id="calendario">
        <div className="lq-section-head">
          <div>
            <p className="af-tele text-foreground">
              <span className="text-signal">AF</span>://DONDE-VER
            </p>
            <h2 className="lq-h2">Horarios y dónde ver</h2>
          </div>
          <Link href="/donde-ver" className="af-tele text-signal hover:text-foreground">
            Guía de canales →
          </Link>
        </div>
        {board.rounds.map((r) => (
          <CalendarRound key={r.round} round={r} tz={tz} />
        ))}
      </section>

      <section className="lq-section lq-split" id="formato">
        <div>
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>://FORMATO
          </p>
          <h2 className="lq-h2">Cómo se juega</h2>
          <ul className="lq-rules">
            {LIGUILLA_RULES.map((r) => (
              <li key={r.title}>
                <strong>{r.title}</strong>
                <span>{r.body}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>://SEMBRADOS
          </p>
          <h2 className="lq-h2">Los 8 de la fiesta</h2>
          <Seeds board={board} />
        </div>
      </section>
    </div>
  );
}
