import type { Fixture } from '@/lib/sports';

export function dondeVerGuideRows(
  live: Fixture[],
  upcoming: Fixture[],
  played: Fixture[] = []
): Fixture[] {
  const seen = new Set<string>();
  return [...played, ...live, ...upcoming]
    .filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    })
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

export type DondeVerDayGroup = {
  key: string;
  label: string;
  rows: Fixture[];
};

function dayKey(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function dayLabel(iso: string, tz: string): string {
  try {
    const raw = new Intl.DateTimeFormat('es-MX', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(iso));
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  } catch {
    return '';
  }
}

/** Live first, then remaining matches grouped by local calendar day. */
export function groupDondeVerByDay(rows: Fixture[], tz: string): {
  live: Fixture[];
  days: DondeVerDayGroup[];
} {
  const live = rows.filter((f) => f.state === 'in');
  const rest = rows.filter((f) => f.state !== 'in');
  const map = new Map<string, DondeVerDayGroup>();
  for (const f of rest) {
    const key = dayKey(f.date, tz);
    const hit = map.get(key);
    if (hit) hit.rows.push(f);
    else map.set(key, { key, label: dayLabel(f.date, tz), rows: [f] });
  }
  return { live, days: [...map.values()] };
}

function lineFor(f: Fixture): string {
  const pair = `${f.home.abbreviation} vs ${f.away.abbreviation}`;
  const mx = f.dondeVer?.mx && f.dondeVer.confirmed ? f.dondeVer.mx : 'Por confirmar';
  const us = f.dondeVer?.us && f.dondeVer.confirmed ? f.dondeVer.us : 'Por confirmar';
  return `${pair} · MX ${mx} · US ${us}`;
}

export function dondeVerShareCopy(
  fixtures: Fixture[],
  jornadaNum?: number
): { title: string; text: string } {
  const title = jornadaNum
    ? `Dónde ver Liga MX · Jornada ${jornadaNum}`
    : 'Dónde ver Liga MX';
  const text =
    fixtures.length > 0
      ? fixtures.map(lineFor).join('\n')
      : 'Guía MX ↔ US en Acceso Futbol';
  return { title, text };
}
