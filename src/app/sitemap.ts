import type { MetadataRoute } from 'next';
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
      url: `${siteConfig.url}/mediakit`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteConfig.url}/inicio`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.4,
    },
  ];

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
