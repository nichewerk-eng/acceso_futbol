/**
 * Seed the "Dónde ver" Google Sheet from the code tables.
 *   npx tsx scripts/export-donde-ver-sheet.mts
 * Writes docs/donde-ver/{partidos,clubes,canales}.csv — import each as a tab.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { codeDondeVerTables, TV_CHANNELS, type TvChannelId } from '@/config/dondeVer';
import { APERTURA_2026_FIXTURES } from '@/fixtures/ligamx-apertura-2026';
import { mexicoDayKey } from '@/lib/radio/phases';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: (string | number)[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
const SLOTS = 6;
const slotCells = (ids: TvChannelId[]) =>
  Array.from({ length: SLOTS }, (_, i) => (ids[i] ? TV_CHANNELS[ids[i]!].label : ''));
const mxUsHeaders = [
  ...Array.from({ length: SLOTS }, (_, i) => `MX ${i + 1}`),
  ...Array.from({ length: SLOTS }, (_, i) => `US ${i + 1}`),
];
const pair = (a: string, b: string) => [scheduleAbbr(a), scheduleAbbr(b)].sort().join('|');

const { guide, clubs } = codeDondeVerTables();
const calendar = APERTURA_2026_FIXTURES.map((f) => ({
  n: Number(f.jornada?.match(/(\d+)/)?.[1]),
  day: mexicoDayKey(new Date(f.date)),
  date: f.date,
  home: f.home.abbreviation,
  away: f.away.abbreviation,
  pair: pair(f.home.abbreviation, f.away.abbreviation),
}));

// Per-match GUIDE wins; everyone else gets the home-club default.
const override = new Map<string, { mx: TvChannelId[]; us: TvChannelId[]; dated: boolean }>();
const skipped: string[] = [];
for (const [key, val] of Object.entries(guide)) {
  const [first, a, b] = key.split('|');
  const p = pair(a, b);
  const jm = first.match(/^j(\d+)$/);
  const row = jm
    ? calendar.find((c) => c.n === Number(jm[1]) && c.pair === p)
    : calendar.find((c) => c.day === first && c.pair === p);
  if (!row) {
    skipped.push(key);
    continue;
  }
  const id = `j${row.n}|${p}`;
  const dated = !jm;
  const prev = override.get(id);
  if (prev?.dated && !dated) continue;
  override.set(id, { mx: val.mx, us: val.us, dated });
}

const partidos = calendar
  .slice()
  .sort((x, y) => x.n - y.n || x.date.localeCompare(y.date))
  .map((row) => {
    const hit = override.get(`j${row.n}|${row.pair}`);
    const homeTv = clubs[row.home];
    const mx = hit?.mx ?? homeTv?.mx ?? [];
    const us = hit?.us ?? homeTv?.us ?? [];
    const nota = hit ? '' : 'default local';
    return [row.n, row.day, row.home, row.away, ...slotCells(mx), ...slotCells(us), nota];
  });

mkdirSync('docs/donde-ver', { recursive: true });
writeFileSync(
  'docs/donde-ver/partidos.csv',
  csv([['Jornada', 'Fecha', 'Local', 'Visita', ...mxUsHeaders, 'Nota'], ...partidos])
);
writeFileSync(
  'docs/donde-ver/clubes.csv',
  csv([
    ['Club', ...mxUsHeaders],
    ...Object.entries(clubs)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([club, v]) => [club, ...slotCells(v.mx), ...slotCells(v.us)]),
  ])
);
writeFileSync(
  'docs/donde-ver/canales.csv',
  csv([
    ['Canal', 'Id', 'Tipo'],
    ['Ninguno', '-', '—'],
    ...Object.values(TV_CHANNELS).map((c) => [c.label, c.id, c.kind === 'tv' ? 'TV' : 'Streaming']),
  ])
);
const confirmed = [...override.keys()].length;
console.log(
  `partidos ${partidos.length} (${confirmed} con guía, ${partidos.length - confirmed} default local), clubes ${Object.keys(clubs).length}, canales ${Object.keys(TV_CHANNELS).length}`
);
if (skipped.length) console.log('not in calendar:', skipped.join(' '));
