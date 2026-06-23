import type { Group, TeamEntry } from './types';
import { teamNameEs } from './teamNames';

// ── Hardcoded R32 bracket (from FIFA / ESPN fixture data) ──────────────────────
// Slot encoding:
//   "X1"    = Winner of Group X
//   "X2"    = Runner-up of Group X
//   "T:XYZ" = Best 3rd place from Groups X, Y, Z (Annex C)

interface R32Match {
  id: string;
  date: string;
  homeSlot: string;
  awaySlot: string;
  venue: string;
  city: string;
}

const R32: R32Match[] = [
  { id: 'r32-01', date: '2026-06-28', homeSlot: 'A2',       awaySlot: 'B2',       venue: 'SoFi Stadium',           city: 'Inglewood, CA'      },
  { id: 'r32-02', date: '2026-06-29', homeSlot: 'C1',       awaySlot: 'F2',       venue: 'NRG Stadium',            city: 'Houston, TX'        },
  { id: 'r32-03', date: '2026-06-29', homeSlot: 'E1',       awaySlot: 'T:ABCDF',  venue: 'Gillette Stadium',       city: 'Foxborough, MA'     },
  { id: 'r32-04', date: '2026-06-30', homeSlot: 'F1',       awaySlot: 'C2',       venue: 'Estadio BBVA',           city: 'Guadalupe, NL'      },
  { id: 'r32-05', date: '2026-06-30', homeSlot: 'E2',       awaySlot: 'I2',       venue: 'AT&T Stadium',           city: 'Arlington, TX'      },
  { id: 'r32-06', date: '2026-06-30', homeSlot: 'I1',       awaySlot: 'T:CDFGH',  venue: 'MetLife Stadium',        city: 'East Rutherford, NJ'},
  { id: 'r32-07', date: '2026-07-01', homeSlot: 'A1',       awaySlot: 'T:CEFHI',  venue: 'Estadio Banorte',        city: 'Ciudad de México'   },
  { id: 'r32-08', date: '2026-07-01', homeSlot: 'L1',       awaySlot: 'T:EHIJK',  venue: 'Mercedes-Benz Stadium',  city: 'Atlanta, GA'        },
  { id: 'r32-09', date: '2026-07-01', homeSlot: 'G1',       awaySlot: 'T:AEHIJ',  venue: 'Lumen Field',            city: 'Seattle, WA'        },
  { id: 'r32-10', date: '2026-07-02', homeSlot: 'D1',       awaySlot: 'T:BEFIJ',  venue: "Levi's Stadium",         city: 'Santa Clara, CA'    },
  { id: 'r32-11', date: '2026-07-02', homeSlot: 'H1',       awaySlot: 'J2',       venue: 'SoFi Stadium',           city: 'Inglewood, CA'      },
  { id: 'r32-12', date: '2026-07-02', homeSlot: 'K2',       awaySlot: 'L2',       venue: 'BMO Field',              city: 'Toronto'            },
  { id: 'r32-13', date: '2026-07-03', homeSlot: 'B1',       awaySlot: 'T:EFGIJ',  venue: 'BC Place',               city: 'Vancouver'          },
  { id: 'r32-14', date: '2026-07-03', homeSlot: 'D2',       awaySlot: 'G2',       venue: 'AT&T Stadium',           city: 'Arlington, TX'      },
  { id: 'r32-15', date: '2026-07-03', homeSlot: 'J1',       awaySlot: 'H2',       venue: 'Hard Rock Stadium',      city: 'Miami, FL'          },
  { id: 'r32-16', date: '2026-07-04', homeSlot: 'K1',       awaySlot: 'T:DEIJL',  venue: 'Arrowhead Stadium',      city: 'Kansas City, MO'    },
];

// ── Flag emoji (shared with StandingsView) ─────────────────────────────────────
const FLAG: Record<string, string> = {
  MEX: '🇲🇽', KOR: '🇰🇷', CZE: '🇨🇿', RSA: '🇿🇦',
  CAN: '🇨🇦', BIH: '🇧🇦', SUI: '🇨🇭', QAT: '🇶🇦',
  BRA: '🇧🇷', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', HAI: '🇭🇹', MAR: '🇲🇦',
  PAR: '🇵🇾', TUR: '🇹🇷', AUS: '🇦🇺', USA: '🇺🇸',
  ECU: '🇪🇨', GER: '🇩🇪', CIV: '🇨🇮', CUW: '🇨🇼',
  NED: '🇳🇱', SWE: '🇸🇪', JPN: '🇯🇵', TUN: '🇹🇳',
  BEL: '🇧🇪', IRN: '🇮🇷', EGY: '🇪🇬', NZL: '🇳🇿',
  ESP: '🇪🇸', URU: '🇺🇾', KSA: '🇸🇦', CPV: '🇨🇻',
  NOR: '🇳🇴', FRA: '🇫🇷', SEN: '🇸🇳', IRQ: '🇮🇶',
  ARG: '🇦🇷', AUT: '🇦🇹', ALG: '🇩🇿', JOR: '🇯🇴',
  COL: '🇨🇴', POR: '🇵🇹', UZB: '🇺🇿', COD: '🇨🇩',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', CRO: '🇭🇷', PAN: '🇵🇦', GHA: '🇬🇭',
};
const flag = (abbr: string) => FLAG[abbr] ?? '🏳️';

// ── Slot resolution ────────────────────────────────────────────────────────────

type Certainty = 'confirmed' | 'projected' | 'seeded';

interface SlotResult {
  team: TeamEntry | null;
  label: string;
  isThird: boolean;
  certainty: Certainty;
}

/**
 * ESPN marks each team's note.color to signal their standing:
 *   green  → clinched / confirmed advancement
 *   yellow → still in play (leading but not yet locked)
 *   red    → eliminated
 *
 * We parse the hex color and treat any clearly-green shade as confirmed.
 * A description fallback catches any exact "Clinched …" phrases too.
 */
function noteIsConfirmed(
  note: { color: string; description: string; rank: number } | null,
): boolean {
  if (!note) return false;

  // ── Color-based check (most reliable) ───────────────────────────────────
  const c = (note.color ?? '').toLowerCase().trim();
  if (c === 'green') return true;
  if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
    let r: number, g: number, b: number;
    if (c.length === 4) {
      r = parseInt(c[1] + c[1], 16);
      g = parseInt(c[2] + c[2], 16);
      b = parseInt(c[3] + c[3], 16);
    } else {
      r = parseInt(c.slice(1, 3), 16);
      g = parseInt(c.slice(3, 5), 16);
      b = parseInt(c.slice(5, 7), 16);
    }
    // Green if the G channel clearly dominates R and B
    if (g > 80 && g > r + 20 && g > b + 5) return true;
  }

  // ── Description fallback (exact start match, not .includes) ─────────────
  const desc = (note.description ?? '').toLowerCase();
  return desc.startsWith('clinched') || desc.startsWith('advances');
}

/**
 * Returns 'confirmed' if ESPN has flagged this team's note as a green
 * (clinched) colour, or if every team in the group has played all 3 games.
 * Falls back to projected / seeded otherwise.
 */
function teamCertainty(
  team: TeamEntry | null | undefined,
  group: Group | undefined,
): Certainty {
  if (!team) return 'seeded';

  if (noteIsConfirmed(team.note)) return 'confirmed';

  // All 3 group games finished → standings are final
  if (group?.entries.every((e) => e.gp >= 3)) return 'confirmed';

  if (team.gp > 0) return 'projected';
  return 'seeded';
}

// The 8 third-place slots in the bracket (Annex C order)
const THIRD_SLOTS = [
  'T:ABCDF', 'T:CDFGH', 'T:CEFHI', 'T:EHIJK',
  'T:AEHIJ', 'T:BEFIJ', 'T:EFGIJ', 'T:DEIJL',
] as const;

/**
 * Pre-compute all 8 third-place slot assignments with global deduplication.
 * Ranks all 12 thirds by pts → GD → GF, then greedily assigns the best
 * available third to each slot (a team can only appear in one slot).
 */
function computeThirdAssignments(groups: Group[]): Map<string, TeamEntry | null> {
  // team id → group letter
  const teamToGroup = new Map<string, string>();
  for (const group of groups) {
    const letter = group.abbreviation.replace('Group ', '');
    for (const entry of group.entries) {
      teamToGroup.set(entry.team.id, letter);
    }
  }

  // All 12 thirds sorted: pts ↓, GD ↓, GF ↓
  const allThirds = groups
    .flatMap((g) => g.entries.filter((e) => e.position === 3))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const gdA = Number(a.gd);
      const gdB = Number(b.gd);
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });

  const assignments = new Map<string, TeamEntry | null>();
  const usedIds = new Set<string>();

  for (const slot of THIRD_SLOTS) {
    const eligible = new Set(slot.slice(2).split(''));
    const best =
      allThirds.find((t) => {
        const gl = teamToGroup.get(t.team.id);
        return gl && eligible.has(gl) && !usedIds.has(t.team.id);
      }) ?? null;
    assignments.set(slot, best);
    if (best) usedIds.add(best.team.id);
  }

  return assignments;
}

function resolveSlot(
  slot: string,
  groupMap: Map<string, Group>,
  thirdAssignments: Map<string, TeamEntry | null>,
): SlotResult {
  // Winner  e.g. "A1"
  if (/^[A-L]1$/.test(slot)) {
    const g    = groupMap.get(slot[0]);
    const team = g?.entries.find((e) => e.position === 1) ?? null;
    return {
      team,
      label: `1° Gr. ${slot[0]}`,
      isThird: false,
      certainty: teamCertainty(team, g),
    };
  }

  // Runner-up  e.g. "A2"
  if (/^[A-L]2$/.test(slot)) {
    const g    = groupMap.get(slot[0]);
    const team = g?.entries.find((e) => e.position === 2) ?? null;
    return {
      team,
      label: `2° Gr. ${slot[0]}`,
      isThird: false,
      certainty: teamCertainty(team, g),
    };
  }

  // Best 3rd  e.g. "T:ABCDF" — use pre-computed deduplicated assignment
  if (slot.startsWith('T:')) {
    const groupLetters = slot.slice(2).split('').join('/');
    const team = thirdAssignments.get(slot) ?? null;
    return {
      team,
      label: `Mejor 3° (${groupLetters})`,
      isThird: true,
      certainty: 'projected',
    };
  }

  return { team: null, label: slot, isThird: false, certainty: 'seeded' };
}

// ── Date formatting ────────────────────────────────────────────────────────────
function fmtMatchDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ── Team slot card ─────────────────────────────────────────────────────────────
function TeamSlot({
  result,
  align,
}: {
  result: SlotResult;
  align: 'left' | 'right';
}) {
  const { team, label, certainty } = result;
  const isRight = align === 'right';

  const nameColor =
    certainty === 'confirmed'
      ? 'text-gray-900 dark:text-white'
      : certainty === 'projected'
        ? 'text-gray-700 dark:text-white/80'
        : 'text-gray-400 dark:text-white/40';

  const certBadge =
    certainty === 'confirmed'
      ? { text: 'Confirmado', cls: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400' }
      : certainty === 'projected'
        ? { text: 'Proyectado', cls: 'bg-brand-orange/15 text-brand-orange' }
        : { text: 'Sin definir', cls: 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/25' };

  return (
    <div
      className={[
        'flex min-w-0 flex-1 flex-col gap-1',
        isRight ? 'items-end text-right' : 'items-start text-left',
      ].join(' ')}
    >
      {/* Flag + name */}
      <div
        className={[
          'flex items-center gap-2',
          isRight ? 'flex-row-reverse' : '',
        ].join(' ')}
      >
        <span className="text-2xl leading-none">
          {team ? flag(team.team.abbreviation) : '–'}
        </span>
        <span className={['text-sm font-bold truncate max-w-[100px] sm:max-w-[140px]', nameColor].join(' ')}>
          {team ? teamNameEs(team.team.name) : '—'}
        </span>
      </div>

      {/* Slot label */}
      <span className="text-[10px] text-gray-400 dark:text-white/30 font-medium">{label}</span>

      {/* Stats row */}
      {team && team.gp > 0 && (
        <span className="text-[10px] text-gray-400 dark:text-white/40">
          {team.gp}PJ · {team.pts}pts · DG {team.gd}
        </span>
      )}

      {/* Certainty badge */}
      <span
        className={[
          'inline-block rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase',
          certBadge.cls,
        ].join(' ')}
      >
        {certBadge.text}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  groups: Group[];
  userTz: string;
}

export default function BracketView({ groups, userTz }: Props) {
  const groupMap = new Map(
    groups.map((g) => [g.abbreviation.replace('Group ', ''), g]),
  );

  // Pre-compute deduplicated third-place assignments once
  const thirdAssignments = computeThirdAssignments(groups);

  // Group matches by date for section headers
  const byDate = R32.reduce<Record<string, R32Match[]>>((acc, m) => {
    (acc[m.date] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div>
      {/* ── Legend ── */}
      <div className="mb-5 flex flex-wrap gap-3">
        <LegendBadge cls="bg-emerald-500/15 text-emerald-400" label="Confirmado — clasificado" />
        <LegendBadge cls="bg-brand-orange/15 text-brand-orange" label="Proyectado — en juego" />
        <LegendBadge cls="bg-white/5 dark:bg-white/5 bg-gray-100 text-gray-400 dark:text-white/25" label="Sin definir — jornada no iniciada" />
      </div>

      {/* ── Matches grouped by date ── */}
      {Object.entries(byDate).map(([date, matches]) => (
        <div key={date} className="mb-8">
          {/* Date header */}
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 dark:text-white/40">
              {fmtMatchDate(date, userTz)}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-white/[0.06]" />
          </div>

          {/* Match cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {matches.map((match) => {
              const home = resolveSlot(match.homeSlot, groupMap, thirdAssignments);
              const away = resolveSlot(match.awaySlot, groupMap, thirdAssignments);

              // Highlight if Mexico is playing
              const mexInvolved =
                home.team?.team.abbreviation === 'MEX' ||
                away.team?.team.abbreviation === 'MEX';

              return (
                <div
                  key={match.id}
                  className={[
                    'relative overflow-hidden rounded-2xl border p-4 transition-all',
                    mexInvolved
                      ? 'border-brand-orange/30 bg-brand-orange/[0.04] shadow-[0_0_20px_rgba(240,120,32,0.08)]'
                      : 'border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none',
                  ].join(' ')}
                >
                  {mexInvolved && (
                    <div
                      className="pointer-events-none absolute inset-0 opacity-10"
                      style={{
                        background:
                          'radial-gradient(ellipse 80% 60% at 50% -20%, #f07820, transparent)',
                      }}
                    />
                  )}

                  {/* Venue */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 dark:text-white/30 truncate">{match.venue}</span>
                    <span className="ml-2 shrink-0 text-[10px] text-gray-400 dark:text-white/20">{match.city}</span>
                  </div>

                  {/* Teams */}
                  <div className="flex items-center gap-3">
                    <TeamSlot result={home} align="left" />
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <span className="text-xs font-bold text-gray-300 dark:text-white/20">vs</span>
                    </div>
                    <TeamSlot result={away} align="right" />
                  </div>

                  {/* Mexico highlight tag */}
                  {mexInvolved && (
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-brand-orange/70">
                        🇲🇽 El Tri en juego
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="mt-4 text-center text-[10px] text-gray-400 dark:text-white/20">
        Proyecciones basadas en la tabla actual · Se actualiza cada 30 segundos
      </p>
    </div>
  );
}

function LegendBadge({ cls, label }: { cls: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={['inline-block rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase', cls].join(' ')}>
        ●
      </span>
      <span className="text-[10px] text-gray-400 dark:text-white/30">{label}</span>
    </div>
  );
}
