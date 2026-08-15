import type { MetadataRoute } from 'next';
import { allClubIdentities } from '@/config/clubIdentity';
import { MOMENTS } from '@/config/moments';
import { siteConfig } from '@/config/site';
import {
  fetchLeaguesCupSeasonFixtures,
  fetchLigaMxSeasonFixtures,
  involvesLigaMxClub,
  sportmonksEnabled,
} from '@/lib/sports';

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
      url: `${siteConfig.url}/leagues-cup`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
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

  for (const m of MOMENTS) {
    entries.push({
      url: `${siteConfig.url}/momento/${m.id}`,
      lastModified: m.publishedAt ? new Date(m.publishedAt) : now,
      changeFrequency: 'weekly',
      priority: m.cable ? 0.65 : 0.5,
    });
  }

  if (!sportmonksEnabled()) return entries;

  try {
    const [liga, cup] = await Promise.all([
      fetchLigaMxSeasonFixtures().catch(() => []),
      fetchLeaguesCupSeasonFixtures().catch(() => []),
    ]);

    const seen = new Set<string>();
    for (const f of liga) {
      const url = `${siteConfig.url}/partido/liga-mx/${f.id}`;
      if (seen.has(url)) continue;
      seen.add(url);
      entries.push({
        url,
        lastModified: new Date(f.date),
        changeFrequency: f.state === 'in' ? 'always' : 'daily',
        priority: f.state === 'in' ? 0.95 : f.state === 'pre' ? 0.8 : 0.55,
      });
    }
    for (const f of cup) {
      if (!involvesLigaMxClub(f.home, f.away)) continue;
      const url = `${siteConfig.url}/partido/leagues-cup/${f.id}`;
      if (seen.has(url)) continue;
      seen.add(url);
      entries.push({
        url,
        lastModified: new Date(f.date),
        changeFrequency: f.state === 'in' ? 'always' : 'daily',
        priority: f.state === 'in' ? 0.95 : f.state === 'pre' ? 0.85 : 0.55,
      });
    }
  } catch {
    /* static routes only */
  }

  return entries;
}
