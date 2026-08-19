'use client';

import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { DondeVerAir } from '@/components/living-room/DondeVerAir';
import { DondeVerShare } from '@/components/living-room/DondeVerShare';
import { RitualSlot } from '@/components/ritual/RitualSlot';
import { groupDondeVerByDay, dondeVerGuideRows } from '@/lib/share/dondeVerShare';
import type { Fixture } from '@/lib/sports';

function kickClock(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function GuideRow({
  f,
  mine,
  tz,
}: {
  f: Fixture;
  mine: boolean;
  tz: string;
}) {
  const live = f.state === 'in';
  const post = f.state === 'post';
  const d = f.dondeVer;
  const confirmed = Boolean(d?.confirmed && (d.mxChannels?.length || d.usChannels?.length));

  return (
    <Link
      href={`/partido/liga-mx/${f.id}`}
      data-testid={`donde-ver-match-${f.id}`}
      className={['dv-row', mine ? 'dv-row-mine' : '', live ? 'dv-row-live' : ''].join(' ')}
    >
      <div className="dv-row-meta">
        <p className={live ? 'dv-kick is-live' : post ? 'dv-kick is-ft' : 'dv-kick'}>
          {live ? (
            <>
              <span className="hoy-live-dot" aria-hidden />
              {f.clock === 'HT' || /descanso/i.test(f.statusLabel || '') ? 'HT' : f.clock || 'EN VIVO'}
            </>
          ) : post ? (
            'FT'
          ) : (
            kickClock(f.date, tz)
          )}
        </p>
        {mine ? <span className="dv-lock">LOCK</span> : null}
      </div>

      <div className="dv-pair">
        <span className="dv-side">
          <ClubLogo abbr={f.home.abbreviation} name={f.home.name} size="sm" />
          <span className="dv-abbr">{f.home.abbreviation}</span>
        </span>
        <span className="dv-mid">
          {live || post ? `${f.home.score ?? 0}–${f.away.score ?? 0}` : 'vs'}
        </span>
        <span className="dv-side dv-side-away">
          <span className="dv-abbr">{f.away.abbreviation}</span>
          <ClubLogo abbr={f.away.abbreviation} name={f.away.name} size="sm" />
        </span>
      </div>

      {confirmed ? (
        <DondeVerAir
          mx={d?.mxChannels}
          us={d?.usChannels}
          mxLabel={d?.mx}
          usLabel={d?.us}
        />
      ) : (
        <p className="dv-pending">Por confirmar · MX ↔ US</p>
      )}
    </Link>
  );
}

function DayBlock({
  label,
  rows,
  tz,
  isMine,
  live = false,
}: {
  label: string;
  rows: Fixture[];
  tz: string;
  isMine: (f: Fixture) => boolean;
  live?: boolean;
}) {
  if (!rows.length) return null;
  return (
    <section className={live ? 'dv-day is-live' : 'dv-day'}>
      <p className="dv-day-label">{label}</p>
      <div className="dv-cols" aria-hidden>
        <span>Hora</span>
        <span>Partido</span>
        <span>México</span>
        <span>Estados Unidos</span>
      </div>
      <div className="dv-list">
        {rows.map((f) => (
          <GuideRow key={f.id} f={f} mine={isMine(f)} tz={tz} />
        ))}
      </div>
    </section>
  );
}

export function DondeVerGuide({
  jornadaNum,
  live,
  upcoming,
  played = [],
  tz,
  isMine,
  asPage = false,
  showRitual = true,
}: {
  jornadaNum?: number;
  live: Fixture[];
  upcoming: Fixture[];
  played?: Fixture[];
  tz: string;
  isMine: (f: Fixture) => boolean;
  asPage?: boolean;
  showRitual?: boolean;
}) {
  const chrono = dondeVerGuideRows(live, upcoming, played);
  const grouped = groupDondeVerByDay(chrono, tz);
  const Title = asPage ? 'h1' : 'h3';

  if (chrono.length === 0) return null;

  return (
    <div
      id="donde-ver"
      data-testid="section-donde-ver"
      className={asPage ? 'dv-guide dv-guide-page' : 'dv-guide'}
    >
      <div className="dv-guide-head">
        <div>
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>
            ://DONDE-VER
          </p>
          <Title className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
            Dónde ver{jornadaNum ? ` · Jornada ${jornadaNum}` : ''}
          </Title>
          <p className="mt-2 max-w-xl font-mono text-[12px] leading-6 text-muted">
            Cada partido con su canal en México y en Estados Unidos. Horario en tu zona.
          </p>
        </div>
        <div className="dv-guide-actions">
          <p className="af-tele">{chrono.length} partidos</p>
          <DondeVerShare fixtures={chrono} jornadaNum={jornadaNum} />
        </div>
      </div>

      <DayBlock label="En vivo" rows={grouped.live} tz={tz} isMine={isMine} live />
      {grouped.days.map((d) => (
        <DayBlock key={d.key} label={d.label} rows={d.rows} tz={tz} isMine={isMine} />
      ))}

      {showRitual ? (
        <div className="dv-ritual">
          <RitualSlot placement="donde-ver" compact />
        </div>
      ) : null}
    </div>
  );
}
