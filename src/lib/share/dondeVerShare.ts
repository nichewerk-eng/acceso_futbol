import type { Fixture } from '@/lib/sports';

export function dondeVerGuideRows(live: Fixture[], upcoming: Fixture[]): Fixture[] {
  return [...live, ...upcoming].sort((a, b) => +new Date(a.date) - +new Date(b.date));
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
