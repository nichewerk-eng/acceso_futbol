import { attachDondeVer } from '@/config/dondeVer';
import { getClubIdentity, type ClubIdentity } from '@/config/clubIdentity';
import { MOMENTS } from '@/config/moments';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';
import { fetchLigaMxFixtures } from '@/lib/sports/espnFallback';
import { fetchLigaMxStandings, fetchClubForm, sportmonksEnabled } from '@/lib/sports/sportmonks';
import { fetchSeleccionSchedule } from '@/lib/sports/seleccion';
import { espnFetch, standingsUrl, SLUG } from '@/lib/espn';
import type { Fixture, FormMatch } from '@/lib/sports/types';

export type ClubTableRow = {
  position: number;
  gp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: string;
  pts: number;
  season: string;
};

export type ClubBoard = {
  club: {
    id: string;
    name: string;
    abbreviation: string;
    league: ClubIdentity['league'];
    palette: ClubIdentity['palette'];
    weatherLine: string;
  };
  accesoLine: string;
  table: ClubTableRow | null;
  form: FormMatch[];
  next: Fixture | null;
  live: Fixture | null;
  recent: Fixture[];
  upcoming: Fixture[];
  generatedAt: string;
};

function isClubSide(f: Fixture, club: ClubIdentity): boolean {
  if (club.league === 'seleccion') {
    const blob = `${f.home.name} ${f.away.name} ${f.home.abbreviation} ${f.away.abbreviation}`;
    return /m[eé]x|mex|tri/i.test(blob);
  }
  const abbr = scheduleAbbr(club.abbreviation);
  const home = scheduleAbbr(f.home.abbreviation);
  const away = scheduleAbbr(f.away.abbreviation);
  if (home === abbr || away === abbr) return true;
  if (club.smTeamId != null) {
    const sid = String(club.smTeamId);
    if (f.home.id === sid || f.away.id === sid) return true;
  }
  return false;
}

function pinAccesoLine(club: ClubIdentity): string {
  const moment = MOMENTS.find(
    (m) => m.clubIds?.includes(club.id) && (m.accesoLine || m.body)
  );
  return moment?.accesoLine || moment?.body || club.weatherLine;
}

async function loadStandingsRow(club: ClubIdentity): Promise<ClubTableRow | null> {
  if (club.league === 'seleccion') return null;

  try {
    if (sportmonksEnabled()) {
      const sm = await fetchLigaMxStandings();
      const hit = sm.entries.find(
        (e) =>
          scheduleAbbr(e.team.abbreviation) === scheduleAbbr(club.abbreviation) ||
          (club.smTeamId != null && String(e.team.id) === String(club.smTeamId))
      );
      if (hit) {
        return {
          position: hit.position,
          gp: hit.gp,
          w: hit.w,
          d: hit.d,
          l: hit.l,
          gf: hit.gf,
          ga: hit.ga,
          gd: hit.gd,
          pts: hit.pts,
          season: sm.season,
        };
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const raw = (await espnFetch(standingsUrl(SLUG.LIGA_MX), {
      revalidate: 60,
    })) as {
      season?: { displayName?: string };
      standings?: { entries?: EspnEntry[] };
      children?: { standings?: { entries?: EspnEntry[] } }[];
    };
    const entries =
      raw.standings?.entries ?? raw.children?.[0]?.standings?.entries ?? [];
    const season = raw.season?.displayName ?? 'Apertura 2026';
    for (const entry of entries) {
      if (scheduleAbbr(entry.team.abbreviation) !== scheduleAbbr(club.abbreviation)) {
        continue;
      }
      const sm = Object.fromEntries(entry.stats.map((s) => [s.abbreviation, s]));
      return {
        position: Number(sm['R']?.value ?? sm['POS']?.value ?? 0),
        gp: Number(sm['GP']?.value ?? 0),
        w: Number(sm['W']?.value ?? 0),
        d: Number(sm['D']?.value ?? 0),
        l: Number(sm['L']?.value ?? 0),
        gf: Number(sm['F']?.value ?? sm['GF']?.value ?? 0),
        ga: Number(sm['A']?.value ?? sm['GA']?.value ?? 0),
        gd: sm['GD']?.displayValue ?? '0',
        pts: Number(sm['P']?.value ?? sm['PTS']?.value ?? 0),
        season,
      };
    }
  } catch {
    /* empty */
  }
  return null;
}

type EspnEntry = {
  team: { abbreviation: string };
  stats: { abbreviation: string; value: number; displayValue: string }[];
};

export async function getClubBoard(slug: string): Promise<ClubBoard | null> {
  const club = getClubIdentity(slug);
  if (!club) return null;

  const fixturesPromise =
    club.league === 'seleccion'
      ? fetchSeleccionSchedule()
      : fetchLigaMxFixtures().then((r) => r.fixtures);

  const formPromise =
    club.smTeamId != null && sportmonksEnabled()
      ? fetchClubForm(String(club.smTeamId), 5)
      : Promise.resolve([] as FormMatch[]);

  const [fixturesRaw, table, form] = await Promise.all([
    fixturesPromise,
    loadStandingsRow(club),
    formPromise,
  ]);

  const mine = fixturesRaw.filter((f) => isClubSide(f, club)).map(attachDondeVer);
  const now = Date.now();

  const live = mine.find((f) => f.state === 'in') ?? null;
  const recent = mine
    .filter((f) => f.state === 'post')
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 8);
  const upcoming = mine
    .filter((f) => f.state === 'pre' && +new Date(f.date) >= now - 60_000)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 8);
  const next = live ?? upcoming[0] ?? null;

  return {
    club: {
      id: club.id,
      name: club.name,
      abbreviation: club.abbreviation,
      league: club.league,
      palette: club.palette,
      weatherLine: club.weatherLine,
    },
    accesoLine: pinAccesoLine(club),
    table,
    form,
    next,
    live,
    recent,
    upcoming: live ? upcoming : upcoming.slice(1),
    generatedAt: new Date().toISOString(),
  };
}
