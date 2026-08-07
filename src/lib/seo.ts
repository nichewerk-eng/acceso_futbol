import { siteConfig } from '@/config/site';
import type { MatchSnapshot } from '@/lib/sports/types';

export function absoluteUrl(path = '/'): string {
  if (!path || path === '/') return siteConfig.url;
  return `${siteConfig.url}${path.startsWith('/') ? path : `/${path}`}`;
}

export function leagueLabel(league: string): string {
  switch (league) {
    case 'liga-mx':
      return 'Liga MX';
    case 'seleccion':
      return 'El Tri';
    case 'leagues-cup':
      return 'Leagues Cup';
    case 'mundial':
      return 'Mundial 2026';
    default:
      return 'Fútbol';
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteConfig.url,
    email: siteConfig.email,
    foundingDate: String(siteConfig.founded),
    description: siteConfig.description,
    logo: absoluteUrl('/logo.png'),
    sameAs: [
      siteConfig.social.tiktok,
      siteConfig.social.instagram,
      siteConfig.social.facebook,
      siteConfig.social.youtube,
    ],
    areaServed: ['MX', 'US'],
    knowsAbout: [
      'Liga MX',
      'Leagues Cup',
      'Selección Mexicana',
      'FIFA World Cup 2026',
      'Mexican soccer',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: siteConfig.email,
      contactType: 'customer service',
      availableLanguage: ['es', 'en'],
    },
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: 'es-MX',
    publisher: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
  };
}

export function sportsTeamJsonLd(club: {
  id: string;
  name: string;
  abbreviation: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: club.name,
    alternateName: club.abbreviation,
    sport: 'Soccer',
    url: absoluteUrl(`/club/${club.id}`),
    memberOf: {
      '@type': 'SportsOrganization',
      name: club.id === 'el-tri' ? 'FIFA' : 'Liga MX',
    },
  };
}

export function newsArticleJsonLd(opts: {
  headline: string;
  description: string;
  path: string;
  publishedAt?: string;
  image?: string;
  section?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: opts.headline,
    description: opts.description,
    url: absoluteUrl(opts.path),
    mainEntityOfPage: absoluteUrl(opts.path),
    datePublished: opts.publishedAt,
    dateModified: opts.publishedAt,
    image: opts.image ? absoluteUrl(opts.image) : absoluteUrl('/logo.png'),
    articleSection: opts.section ?? 'Fútbol mexicano',
    inLanguage: 'es-MX',
    author: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.png') },
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function sportsEventJsonLd(match: MatchSnapshot, league: string) {
  const name = `${match.home.name} vs ${match.away.name}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name,
    description: `${name} · ${leagueLabel(league)}. Crónica, alineación y Acceso Radio.`,
    startDate: match.date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: match.venue
      ? {
          '@type': 'Place',
          name: match.venue,
          address: match.city ?? undefined,
        }
      : undefined,
    homeTeam: {
      '@type': 'SportsTeam',
      name: match.home.name,
      sport: 'Soccer',
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: match.away.name,
      sport: 'Soccer',
    },
    organizer: {
      '@type': 'Organization',
      name: leagueLabel(league),
    },
    url: absoluteUrl(`/partido/${league}/${match.id}`),
    image: match.home.logo || match.away.logo || absoluteUrl('/logo.png'),
    inLanguage: 'es-MX',
  };
}

export function matchSeoTitle(match: MatchSnapshot, league: string): string {
  const pair = `${match.home.name} vs ${match.away.name}`;
  if (match.state === 'post' && match.home.score != null && match.away.score != null) {
    return `${match.home.abbreviation} ${match.home.score}-${match.away.score} ${match.away.abbreviation} · ${leagueLabel(league)}`;
  }
  if (match.state === 'in' && match.home.score != null && match.away.score != null) {
    return `${pair} EN VIVO ${match.home.score}-${match.away.score}`;
  }
  return `${pair} · ${leagueLabel(league)}`;
}

export function matchSeoDescription(match: MatchSnapshot, league: string): string {
  const bits = [
    `${match.home.name} vs ${match.away.name}`,
    leagueLabel(league),
    match.jornada,
    match.venue,
    match.state === 'in'
      ? 'En vivo: crónica, alineación y Acceso Radio'
      : match.state === 'post'
        ? 'Resultado, crónica y recap'
        : 'Horario, dónde ver, alineación y pre-show',
  ].filter(Boolean);
  return bits.join(' · ');
}
