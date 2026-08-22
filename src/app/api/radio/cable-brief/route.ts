import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/apiCache';
import { aggregateStories } from '@/lib/news/aggregate';
import { getPlayableBrief, type NewsBriefEpisode } from '@/lib/radio/briefEpisode';
import {
  buildCableBriefFeed,
  CABLE_BRIEF_TTL_MS,
  cableBriefId,
  type CableBriefExtras,
  type CableBriefPayload,
} from '@/lib/radio/cableBrief';
import { isRadioStyle, type RadioStyle } from '@/lib/radio/personas';
import { briefDeskTitle, briefStoreKey, playableBriefSlot } from '@/lib/radio/voiceSchedule';
import { clipShareText } from '@/lib/share/recordingShare';
import { getGamesOfDay } from '@/lib/sports/gamesOfDay';
import { getJornadaOverview } from '@/lib/sports/jornada';
import { fetchLigaMxStandings, sportmonksEnabled } from '@/lib/sports/sportmonks';

function withStoredBrief(
  payload: CableBriefPayload,
  stored: NewsBriefEpisode | null
): CableBriefPayload {
  const ref = stored
    ? { dayKey: stored.dayKey, slot: stored.slot }
    : playableBriefSlot();
  const id = stored?.id ?? briefStoreKey(ref.dayKey, ref.slot);
  return {
    ...payload,
    audioUrl: stored?.audioUrl ?? `/api/radio/brief-audio/${encodeURIComponent(id)}`,
    recordedAt: stored?.generatedAt ?? payload.recordedAt,
    slot: stored?.slot ?? ref.slot,
    title: stored?.title ?? briefDeskTitle(ref.slot),
    briefId: id,
    shareText: stored ? clipShareText(stored.transcript) : payload.shareText,
  };
}

export async function GET(req: NextRequest) {
  const styleParam = req.nextUrl.searchParams.get('style') ?? 'caliente';
  if (!isRadioStyle(styleParam)) {
    return NextResponse.json({ error: 'invalid_style' }, { status: 400 });
  }
  const style = styleParam as RadioStyle;
  const cacheKey = `cable-brief-payload-${cableBriefId(style)}`;

  const cached = getCache<CableBriefPayload>(cacheKey, CABLE_BRIEF_TTL_MS);
  const storedEarly = await getPlayableBrief().catch(() => null);
  if (cached) {
    return NextResponse.json(withStoredBrief(cached, storedEarly), {
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
    const next = withStoredBrief(payload, storedEarly);
    setCache(cacheKey, next);

    return NextResponse.json(next, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'brief_unavailable' }, { status: 502 });
  }
}
