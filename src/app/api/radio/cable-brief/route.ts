import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/apiCache';
import { aggregateStories } from '@/lib/news/aggregate';
import {
  buildCableBriefFeed,
  CABLE_BRIEF_TTL_MS,
  cableBriefId,
  type CableBriefExtras,
  type CableBriefPayload,
} from '@/lib/radio/cableBrief';
import { isRadioStyle, type RadioStyle } from '@/lib/radio/personas';
import { getGamesOfDay } from '@/lib/sports/gamesOfDay';
import { getJornadaOverview } from '@/lib/sports/jornada';
import { fetchLigaMxStandings, sportmonksEnabled } from '@/lib/sports/sportmonks';

export async function GET(req: NextRequest) {
  const styleParam = req.nextUrl.searchParams.get('style') ?? 'caliente';
  if (!isRadioStyle(styleParam)) {
    return NextResponse.json({ error: 'invalid_style' }, { status: 400 });
  }
  const style = styleParam as RadioStyle;
  const cacheKey = `cable-brief-payload-${cableBriefId(style)}`;

  const cached = getCache<CableBriefPayload>(cacheKey, CABLE_BRIEF_TTL_MS);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  }

  try {
    const [storiesPayload, jornada, dayPayload, tablaRaw] = await Promise.all([
      aggregateStories(),
      getJornadaOverview().catch(() => null),
      getGamesOfDay().catch(() => null),
      sportmonksEnabled()
        ? fetchLigaMxStandings().catch(() => null)
        : Promise.resolve(null),
    ]);

    const extras: CableBriefExtras = {
      day: dayPayload
        ? {
            dayKey: dayPayload.dayKey,
            upcoming: dayPayload.upcoming,
            games: dayPayload.games.slice(0, 10).map((g) => ({
              home: g.home.name,
              away: g.away.name,
              state: g.state,
              score:
                g.home.score != null && g.away.score != null
                  ? `${g.home.score}-${g.away.score}`
                  : null,
              league: g.league,
              clock: g.clock ?? null,
            })),
          }
        : null,
      tabla: tablaRaw?.entries?.length
        ? {
            season: tablaRaw.season,
            top: tablaRaw.entries.slice(0, 4).map((e) => ({
              pos: e.position,
              team: e.team.name,
              pts: e.pts,
            })),
            liguillaCut: tablaRaw.entries[11]
              ? {
                  pos: tablaRaw.entries[11].position,
                  team: tablaRaw.entries[11].team.name,
                  pts: tablaRaw.entries[11].pts,
                }
              : null,
          }
        : null,
    };

    const payload = await buildCableBriefFeed(
      storiesPayload.stories,
      jornada,
      style,
      new Date(),
      extras
    );
    setCache(cacheKey, payload);

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'brief_unavailable' }, { status: 502 });
  }
}
