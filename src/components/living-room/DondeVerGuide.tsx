'use client';

import Link from 'next/link';
import { BroadcastChannels } from '@/components/brand/BroadcastChannels';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { DondeVerShare } from '@/components/living-room/DondeVerShare';
import { RitualSlot } from '@/components/ritual/RitualSlot';
import { dondeVerGuideRows } from '@/lib/share/dondeVerShare';
import type { Fixture } from '@/lib/sports';

function kickWhen(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
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
        <p className="dv-kick">
          {live ? (
            <>
              <span className="hoy-live-dot" aria-hidden />
              {f.clock === 'HT' || /descanso/i.test(f.statusLabel || '') ? 'HT' : f.clock || 'EN VIVO'}
            </>
          ) : post ? (
            'FT'
          ) : (
            kickWhen(f.date, tz)
          )}
        </p>
        {mine ? <span className="af-tele !text-signal">LOCK</span> : null}
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
        <BroadcastChannels
          className="dv-channels"
          mx={d?.mxChannels}
          us={d?.usChannels}
          mxLabel={d?.mx}
          usLabel={d?.us}
          surface="paper"
          compact
        />
      ) : (
        <p className="dv-pending">Por confirmar · MX ↔ US</p>
      )}
    </Link>
  );
}

export function DondeVerGuide({
  jornadaNum,
  live,
  upcoming,
  played = [],
  tz,
  isMine,
}: {
  jornadaNum?: number;
  live: Fixture[];
  upcoming: Fixture[];
  played?: Fixture[];
  tz: string;
  isMine: (f: Fixture) => boolean;
}) {
  const chrono = dondeVerGuideRows(live, upcoming, played);
  const rows = [...chrono].sort((a, b) => {
    const aMine = isMine(a) ? 0 : 1;
    const bMine = isMine(b) ? 0 : 1;
    if (aMine !== bMine) return aMine - bMine;
    return +new Date(a.date) - +new Date(b.date);
  });

  if (rows.length === 0) return null;

  return (
    <div id="donde-ver" data-testid="section-donde-ver" className="dv-guide">
      <div className="dv-guide-head">
        <div>
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>
            ://DONDE-VER
          </p>
          <h3 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
            Dónde ver{jornadaNum ? ` · Jornada ${jornadaNum}` : ''}
          </h3>
          <p className="mt-2 max-w-lg font-mono text-[12px] leading-6 text-muted">
            MX y US por separado. Horarios en tu zona.
          </p>
        </div>
        <div className="dv-guide-actions">
          <p className="af-tele">{rows.length} en la guía</p>
          <DondeVerShare fixtures={chrono} jornadaNum={jornadaNum} />
        </div>
      </div>

      <div className="dv-list">
        {rows.map((f) => (
          <GuideRow key={f.id} f={f} mine={isMine(f)} tz={tz} />
        ))}
      </div>

      <div className="dv-ritual">
        <RitualSlot placement="donde-ver" compact />
      </div>
    </div>
  );
}
