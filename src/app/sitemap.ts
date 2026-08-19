import type { MetadataRoute } from 'next';
import { LIGA_MX_CLUBS } from '@/config/clubs';
import { allClubIdentities } from '@/config/clubIdentity';
import { MOMENTS } from '@/config/moments';
import { siteConfig } from '@/config/site';
import { seedLigaMxFixtures } from '@/lib/sports/espnFallback';
import {
  fetchLeaguesCupSeasonFixtures,
  fetchLigaMxSeasonFixtures,
  fetchLigaMxFemenilSeasonFixtures,
  involvesLigaMxClub,
  sportmonksEnabled,
} from '@/lib/sports';
import type { Fixture } from '@/lib/sports/types';

function partidoEntry(
  league: string,
  f: Pick<Fixture, 'id' | 'date' | 'state'>
): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteConfig.url}/partido/${league}/${f.id}`,
    lastModified: new Date(f.date),
    changeFrequency: f.state === 'in' ? 'always' : 'daily',
    priority: f.state === 'in' ? 0.95 : f.state === 'pre' ? 0.8 : 0.55,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${siteConfig.url}/liga-mx`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.95,
    },
    {
      url: `${siteConfig.url}/liga-mx-femenil`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/toma`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/donde-ver`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.92,
    },
    {
      url: `${siteConfig.url}/quiniela`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.88,
    },
    {
      url: `${siteConfig.url}/leagues-cup`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/once`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.82,
    },
    {
      url: `${siteConfig.url}/tabla`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.75,
    },
    {
      url: `${siteConfig.url}/nosotros`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.55,
    },
    {
      url: `${siteConfig.url}/contacto`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.55,
    },
    {
      url: `${siteConfig.url}/mediakit`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  for (const club of allClubIdentities()) {
    entries.push({
      url: `${siteConfig.url}/club/${club.id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: club.id === 'el-tri' ? 0.85 : 0.7,
    });
  }

  for (const club of LIGA_MX_CLUBS) {
    entries.push({
      url: `${siteConfig.url}/donde-ver/${club.id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.75,
    });
  }

  for (const m of MOMENTS) {
    entries.push({
      url: `${siteConfig.url}/momento/${m.id}`,
      lastModified: m.publishedAt ? new Date(m.publishedAt) : now,
      changeFrequency: 'weekly',
      priority: m.cable ? 0.65 : 0.5,
    });
  }

  const seen = new Set<string>();
  const pushPartido = (league: string, f: Pick<Fixture, 'id' | 'date' | 'state'>) => {
    const url = `${siteConfig.url}/partido/${league}/${f.id}`;
    if (seen.has(url)) return;
    seen.add(url);
    entries.push(partidoEntry(league, f));
  };

  // Apertura calendar is always in the sitemap so Google can discover match URLs
  // even when Sportmonks is down or unset on a cold isolate.
  for (const f of seedLigaMxFixtures()) pushPartido('liga-mx', f);

  if (!sportmonksEnabled()) return entries;

  try {
    const [liga, femenil, cup] = await Promise.all([
      fetchLigaMxSeasonFixtures().catch(() => []),
      fetchLigaMxFemenilSeasonFixtures().catch(() => []),
      fetchLeaguesCupSeasonFixtures().catch(() => []),
    ]);

    for (const f of liga) pushPartido('liga-mx', f);
    for (const f of femenil) pushPartido('liga-mx-femenil', f);
    for (const f of cup) {
      if (!involvesLigaMxClub(f.home, f.away)) continue;
      pushPartido('leagues-cup', f);
    }
  } catch {
    /* static routes + Apertura calendar already listed */
  }

  return entries;
}
