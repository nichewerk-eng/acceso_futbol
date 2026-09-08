'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { BroadcastChannels } from '@/components/brand/BroadcastChannels';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import { kickHold, kickHoldLabel } from '@/lib/sports/localizeEs';
import type { Fixture } from '@/lib/sports/types';

function dayKeyInTz(d: Date, tz: string) {
  return d.toLocaleDateString('en-CA', { timeZone: tz });
}

function monthKey(day: string) {
  return day.slice(0, 7);
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, 12));
  const label = anchor.toLocaleDateString('es-MX', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dayLabel(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 12));
  return anchor.toLocaleDateString('es-MX', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function fmtTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  });
}

function kickCell(f: Fixture, tz: string) {
  const hold = kickHoldLabel(kickHold(f.statusLabel));
  if (hold) return hold;
  if (/por anunciar|p\.?\s*a\.?/i.test(f.statusLabel || '')) return 'P.A.';
  if (f.state === 'in') return f.clock || 'En vivo';
  if (f.state === 'post') return 'Final';
  return fmtTime(f.date, tz);
}

type Props = { initialFixtures: Fixture[] };

export default function ElTriView({ initialFixtures }: Props) {
  const userTz = useDeviceTimeZone();
  const todayKey = useMemo(() => dayKeyInTz(new Date(), userTz), [userTz]);

  const months = useMemo(() => {
    const sorted = [...initialFixtures].sort(
      (a, b) => +new Date(a.date) - +new Date(b.date)
    );
    const byMonth = new Map<string, Fixture[]>();
    for (const f of sorted) {
      const day = f.scheduleDay ?? dayKeyInTz(new Date(f.date), userTz);
      const key = monthKey(day);
      const list = byMonth.get(key) ?? [];
      list.push(f);
      byMonth.set(key, list);
    }
    return [...byMonth.entries()].map(([ym, rows]) => ({
      ym,
      label: monthLabel(ym),
      rows,
    }));
  }, [initialFixtures, userTz]);

  return (
    <div data-testid="page-el-tri" className="bg-bg-1 text-foreground">
      <section className="border-b border-line px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="af-tele text-signal">AF://EL TRI</p>
          <div className="mt-4 flex flex-wrap items-end gap-5">
            <img
              src="/seleccion_logo/mexico.png"
              alt="Selección Mexicana"
              width={88}
              height={88}
              className="h-16 w-16 object-contain sm:h-20 sm:w-20"
            />
            <div>
              <h1 className="font-display text-3xl font-bold uppercase tracking-wide sm:text-5xl">
                Calendario El Tri
              </h1>
              <p className="mt-3 max-w-xl font-mono text-[12px] leading-6 text-muted">
                Amistosos internacionales · septiembre y octubre 2026. Horarios en tu zona;
                P.A. cuando la Federación aún no publica la hora.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {months.length === 0 ? (
          <div className="border border-line px-5 py-10" data-testid="el-tri-empty">
            <p className="font-display text-2xl font-bold uppercase tracking-wide">
              Sin partidos publicados
            </p>
            <p className="mt-3 max-w-lg font-mono text-[12px] leading-6 text-muted">
              Cuando salga la siguiente fecha FIFA, el calendario se actualiza aquí.
            </p>
            <Link href="/liga-mx" className="af-cta mt-6 inline-flex">
              Ir a Liga MX
            </Link>
          </div>
        ) : (
          <div className="space-y-12" data-testid="el-tri-calendar">
            {months.map((month) => (
              <section key={month.ym} data-testid={`el-tri-month-${month.ym}`}>
                <div className="mb-4 border-b border-line pb-3">
                  <h2 className="font-display text-2xl font-bold uppercase tracking-wide">
                    {month.label}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="el-tri-table w-full min-w-[40rem] border-collapse text-left">
                    <thead>
                      <tr className="af-tele text-muted">
                        <th className="pb-3 pr-4 font-normal">Fecha</th>
                        <th className="pb-3 pr-4 font-normal">Partido</th>
                        <th className="pb-3 pr-4 font-normal">Hora</th>
                        <th className="pb-3 pr-4 font-normal">Competencia</th>
                        <th className="pb-3 font-normal">TV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {month.rows.map((f) => {
                        const day =
                          f.scheduleDay ?? dayKeyInTz(new Date(f.date), userTz);
                        const isToday = day === todayKey;
                        const href = `/partido/seleccion/${f.id}`;
                        return (
                          <tr
                            key={f.id}
                            data-testid={`el-tri-row-${f.id}`}
                            className={[
                              'border-t border-line',
                              isToday ? 'bg-signal/[0.06]' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <td className="py-4 pr-4 align-middle">
                              <p className="font-mono text-[11px] uppercase tracking-[0.12em]">
                                {isToday ? (
                                  <span className="text-signal">Hoy · </span>
                                ) : null}
                                {dayLabel(day)}
                              </p>
                            </td>
                            <td className="py-4 pr-4 align-middle">
                              <Link
                                href={href}
                                className="el-tri-match group flex flex-wrap items-center gap-2 sm:gap-3"
                              >
                                <span className="inline-flex items-center gap-2">
                                  <ClubLogo
                                    abbr={f.home.abbreviation}
                                    name={f.home.name}
                                    logoUrl={f.home.logo}
                                    size="sm"
                                  />
                                  <span className="font-display text-sm font-bold uppercase tracking-wide group-hover:text-signal">
                                    {f.home.name}
                                  </span>
                                </span>
                                <span className="af-tele text-muted">v</span>
                                <span className="inline-flex items-center gap-2">
                                  <ClubLogo
                                    abbr={f.away.abbreviation}
                                    name={f.away.name}
                                    logoUrl={f.away.logo}
                                    size="sm"
                                  />
                                  <span className="font-display text-sm font-bold uppercase tracking-wide group-hover:text-signal">
                                    {f.away.name}
                                  </span>
                                </span>
                              </Link>
                            </td>
                            <td className="py-4 pr-4 align-middle">
                              <span className="font-mono text-[12px] font-semibold tabular-nums">
                                {kickCell(f, userTz)}
                              </span>
                            </td>
                            <td className="py-4 pr-4 align-middle">
                              <span className="font-mono text-[11px] text-muted">
                                {f.jornada || 'Amistoso'}
                              </span>
                            </td>
                            <td className="py-4 align-middle">
                              {f.dondeVer?.confirmed ? (
                                <BroadcastChannels
                                  mx={f.dondeVer.mxChannels}
                                  us={f.dondeVer.usChannels}
                                  mxLabel={f.dondeVer.mx}
                                  usLabel={f.dondeVer.us}
                                  compact
                                  inline
                                />
                              ) : (
                                <span className="font-mono text-[11px] text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
