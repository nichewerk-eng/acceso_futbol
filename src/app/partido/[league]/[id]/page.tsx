import type { Metadata } from 'next';
import Link from 'next/link';
import { MatchChapter } from '@/components/partido/MatchChapter';
import { JsonLd } from '@/components/seo/JsonLd';
import { getMatch } from '@/lib/sports';
import type { MatchSnapshot } from '@/lib/sports/types';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  leagueLabel,
  matchSeoDescription,
  matchSeoTitle,
  sportsEventJsonLd,
} from '@/lib/seo';

interface PageParams {
  params: Promise<{ league: string; id: string }>;
}

function leagueHubPath(league: string): string {
  if (league === 'leagues-cup') return '/leagues-cup';
  if (league === 'liga-mx') return '/liga-mx';
  return '/';
}

function MatchCrawlSummary({
  match,
  league,
}: {
  match: MatchSnapshot;
  league: string;
}) {
  const score =
    match.home.score != null && match.away.score != null
      ? `${match.home.score}-${match.away.score}`
      : null;
  const status =
    match.state === 'in'
      ? 'En vivo'
      : match.state === 'post'
        ? 'Final'
        : 'Por jugar';

  return (
    <section className="sr-only" aria-label="Resumen del partido">
      <h1>
        {match.home.name} vs {match.away.name}
        {score ? ` ${score}` : ''} · {leagueLabel(league)}
      </h1>
      <p>
        {status}
        {match.jornada ? ` · ${match.jornada}` : ''}
        {match.venue ? ` · ${match.venue}` : ''}
        {match.date
          ? ` · ${new Date(match.date).toLocaleString('es-MX', {
              dateStyle: 'full',
              timeStyle: 'short',
            })}`
          : ''}
      </p>
      <p>{matchSeoDescription(match, league)}</p>
      <nav>
        <Link href={leagueHubPath(league)}>{leagueLabel(league)}</Link>
        <Link href="/">Pulso Acceso Futbol</Link>
      </nav>
    </section>
  );
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { league, id } = await params;
  const label = leagueLabel(league);
  const path = `/partido/${league}/${id}`;

  try {
    const match = await getMatch(league, id);
    if (match) {
      const title = matchSeoTitle(match, league);
      const description = matchSeoDescription(match, league);
      return {
        title,
        description,
        alternates: { canonical: absoluteUrl(path) },
        openGraph: {
          title,
          description,
          url: absoluteUrl(path),
          type: 'website',
          locale: 'es_MX',
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
        },
      };
    }
  } catch {
    /* fallback below */
  }

  return {
    title: `Partido · ${label}`,
    description: `Capítulo en vivo, crónica y Acceso Radio. ${label}.`,
    alternates: { canonical: absoluteUrl(path) },
  };
}

export default async function PartidoPage({ params }: PageParams) {
  const { league, id } = await params;
  const hub = leagueHubPath(league);
  let match: MatchSnapshot | null = null;
  const schemas: Record<string, unknown>[] = [
    breadcrumbJsonLd([
      { name: 'Pulso', path: '/' },
      { name: leagueLabel(league), path: hub },
      { name: 'Partido', path: `/partido/${league}/${id}` },
    ]),
  ];

  try {
    match = await getMatch(league, id);
    if (match) {
      schemas.length = 0;
      schemas.push(
        sportsEventJsonLd(match, league),
        breadcrumbJsonLd([
          { name: 'Pulso', path: '/' },
          { name: leagueLabel(league), path: hub },
          {
            name: `${match.home.abbreviation} vs ${match.away.abbreviation}`,
            path: `/partido/${league}/${id}`,
          },
        ])
      );
    }
  } catch {
    /* chapter still loads client-side */
  }

  return (
    <>
      <JsonLd data={schemas} />
      {match ? <MatchCrawlSummary match={match} league={league} /> : null}
      <MatchChapter league={league} id={id} />
    </>
  );
}
