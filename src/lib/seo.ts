import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import { TV_CHANNELS, type TvChannelId } from '@/config/dondeVer';
import { siteConfig } from '@/config/site';
import type { Fixture, MatchSnapshot } from '@/lib/sports/types';

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

/** FAQ rich result — questions/answers rendered on the page (dónde ver, horarios). */
export function faqPageJsonLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  };
}

/** WebPage + Speakable so assistants can read the headline / answer aloud. */
export function webPageJsonLd(opts: {
  name: string;
  path: string;
  description?: string;
  speakableSelectors?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: opts.name,
    url: absoluteUrl(opts.path),
    description: opts.description,
    inLanguage: 'es-MX',
    isPartOf: { '@type': 'WebSite', name: siteConfig.name, url: siteConfig.url },
    ...(opts.speakableSelectors?.length
      ? {
          speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: opts.speakableSelectors,
          },
        }
      : {}),
  };
}

/** ItemList of athletes for leaderboards (goleo / asistencias). */
export function personItemListJsonLd(
  people: { name: string; teamName?: string; position?: string }[],
  opts: { name: string }
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: opts.name,
    itemListElement: people.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Person',
        name: p.name,
        ...(p.position ? { jobTitle: p.position } : {}),
        ...(p.teamName
          ? { memberOf: { '@type': 'SportsTeam', name: p.teamName, sport: 'Soccer' } }
          : {}),
      },
    })),
  };
}

function clubUrlFromAbbr(abbr: string | undefined): string | undefined {
  const id = abbr ? clubIdentityFromAbbr(abbr)?.id : null;
  return id ? absoluteUrl(`/club/${id}`) : undefined;
}

/** BroadcastEvent nodes ("where to watch") for a match, one per confirmed channel. */
function broadcastSubEvents(match: Fixture, eventId: string) {
  const name = `${match.home.name} vs ${match.away.name}`;
  const out: Record<string, unknown>[] = [];
  const push = (ids: TvChannelId[] | undefined, area: 'MX' | 'US') => {
    for (const id of ids ?? []) {
      const ch = TV_CHANNELS[id];
      if (!ch) continue;
      out.push({
        '@type': 'BroadcastEvent',
        name: `${name} — ${ch.label} (${area})`,
        isLiveBroadcast: true,
        broadcastOfEvent: { '@id': eventId },
        videoFormat: ch.kind === 'stream' ? 'streaming' : 'HD',
        publishedOn: {
          '@type': 'BroadcastService',
          name: ch.label,
          broadcastDisplayName: ch.label,
          areaServed: area === 'MX' ? 'MX' : 'US',
        },
      });
    }
  };
  push(match.dondeVer?.mxChannels, 'MX');
  push(match.dondeVer?.usChannels, 'US');
  return out;
}

/** SportsEvent object without `@context` — safe to nest inside an ItemList. */
function sportsEventNode(match: Fixture, league: string) {
  const name = `${match.home.name} vs ${match.away.name}`;
  const path = `/partido/${league}/${match.id}`;
  const eventId = `${absoluteUrl(path)}#event`;
  // schema.org has no "in progress" status; live stays Scheduled until final.
  const eventStatus =
    match.state === 'post'
      ? 'https://schema.org/EventCompleted'
      : 'https://schema.org/EventScheduled';
  // Approximate final whistle (~115 min) so completed events carry an endDate.
  const endDate =
    match.state === 'post' && match.date
      ? new Date(+new Date(match.date) + 115 * 60_000).toISOString()
      : undefined;
  const homeUrl = clubUrlFromAbbr(match.home.abbreviation);
  const awayUrl = clubUrlFromAbbr(match.away.abbreviation);
  const broadcast = broadcastSubEvents(match, eventId);

  return {
    '@type': 'SportsEvent',
    '@id': eventId,
    name,
    description: `${name} · ${leagueLabel(league)}. Crónica, alineación, dónde ver y Acceso Radio.`,
    sport: 'Soccer',
    startDate: match.date,
    ...(endDate ? { endDate } : {}),
    eventStatus,
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
      ...(homeUrl ? { url: homeUrl } : {}),
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: match.away.name,
      sport: 'Soccer',
      ...(awayUrl ? { url: awayUrl } : {}),
    },
    organizer: {
      '@type': 'Organization',
      name: leagueLabel(league),
    },
    ...(broadcast.length ? { subEvent: broadcast } : {}),
    url: absoluteUrl(path),
    image: absoluteUrl(`${path}/opengraph-image`),
    inLanguage: 'es-MX',
  };
}

export function sportsEventJsonLd(match: Fixture, league: string) {
  return { '@context': 'https://schema.org', ...sportsEventNode(match, league) };
}

/** ItemList of the day's / jornada's SportsEvents — for the home + hub pages. */
export function sportsEventItemListJsonLd(
  fixtures: Fixture[],
  opts: { name: string; league?: string }
) {
  const league = opts.league ?? 'liga-mx';
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: opts.name,
    itemListElement: fixtures.map((f, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: sportsEventNode(f, league),
    })),
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
