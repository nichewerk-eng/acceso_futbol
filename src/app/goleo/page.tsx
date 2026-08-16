import type { Metadata } from 'next';
import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { SiteFooter } from '@/components/home/SiteFooter';
import { PulseNav } from '@/components/living-room/PulseNav';
import { JsonLd } from '@/components/seo/JsonLd';
import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  personItemListJsonLd,
  webPageJsonLd,
} from '@/lib/seo';
import { fetchLigaMxLeaders, type GoleoEntry } from '@/lib/sports/leaders';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const board = await fetchLigaMxLeaders().catch(() => null);
  const top = board?.goals[0];
  const season = board?.seasonLabel ?? 'Apertura 2026';
  const title = `Goleo Liga MX · Tabla de goleadores ${season}`;
  const description = top
    ? `Tabla de goleadores de la Liga MX ${season}: ${top.name} lidera con ${top.value} goles. Goleo y asistencias, siempre al día.`
    : `Tabla de goleadores y asistencias de la Liga MX ${season}, siempre al día.`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl('/goleo') },
    openGraph: { title, description, url: absoluteUrl('/goleo'), type: 'website', locale: 'es_MX' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function LeaderRow({ e }: { e: GoleoEntry }) {
  const club = e.teamAbbr ? clubIdentityFromAbbr(e.teamAbbr) : null;
  const sub = [e.teamName ?? e.teamAbbr, e.position, e.games ? `${e.games} PJ` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className={['lead-row', e.rank === 1 ? 'lead-row-top' : ''].filter(Boolean).join(' ')}>
      <span className="lead-rank">{e.rank}</span>
      <ClubLogo
        abbr={e.teamAbbr}
        clubId={club?.id}
        name={e.teamName}
        logoUrl={e.teamLogo}
        size="sm"
      />
      <span className="lead-name">
        <span className="lead-player">{e.name}</span>
        {club ? (
          <Link href={`/club/${club.id}`} className="lead-team">
            {sub}
          </Link>
        ) : (
          <span className="lead-team">{sub}</span>
        )}
      </span>
      <span className="lead-val">{e.value}</span>
    </div>
  );
}

function Board({
  kicker,
  title,
  entries,
  unit,
}: {
  kicker: string;
  title: string;
  entries: GoleoEntry[];
  unit: string;
}) {
  if (!entries.length) return null;
  return (
    <section>
      <p className="af-tele text-foreground">
        <span className="text-signal">AF</span>
        ://{kicker}
      </p>
      <div className="mt-2 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide">{title}</h2>
        <span className="af-tele">{unit}</span>
      </div>
      <div className="lead-board mt-3">
        {entries.map((e) => (
          <LeaderRow key={`${e.athleteId}-${e.rank}`} e={e} />
        ))}
      </div>
    </section>
  );
}

export default async function GoleoPage() {
  const board = await fetchLigaMxLeaders().catch(() => null);
  const season = board?.seasonLabel ?? 'Apertura 2026';
  const hasData = Boolean(board && (board.goals.length || board.assists.length));

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Liga MX', path: '/liga-mx' },
            { name: 'Goleo', path: '/goleo' },
          ]),
          webPageJsonLd({
            name: `Goleo Liga MX · ${season}`,
            path: '/goleo',
            description: `Tabla de goleadores y asistencias de la Liga MX ${season}.`,
            speakableSelectors: ['h1'],
          }),
          ...(board?.goals.length
            ? [
                personItemListJsonLd(
                  board.goals.map((g) => ({
                    name: g.name,
                    teamName: g.teamName,
                    position: g.position,
                  })),
                  { name: `Goleo Liga MX — ${season}` }
                ),
              ]
            : []),
        ]}
      />
      <PulseNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://GOLEO
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">
          Goleo Liga MX
        </h1>
        <p className="mt-3 max-w-2xl font-mono text-[12px] leading-6 text-muted">
          Goleadores y asistencias de la Liga MX · {season}. Fuente ESPN, al corte de la última
          jornada jugada.
        </p>

        {hasData ? (
          <div className="mt-8 space-y-10">
            <Board kicker="GOLES" title="Goleo" entries={board!.goals} unit="Goles" />
            <Board kicker="ASISTENCIAS" title="Asistencias" entries={board!.assists} unit="Asist." />
          </div>
        ) : (
          <p className="mt-8 border border-line bg-bg-2 p-5 font-mono text-[12px] leading-6 text-muted">
            El goleo se actualiza en cuanto avance la jornada. Vuelve después del próximo silbatazo.
          </p>
        )}

        <div className="mt-10 flex flex-wrap gap-2">
          <Link href="/liga-mx" className="af-cta-ghost">
            Tabla de posiciones
          </Link>
          <Link href="/donde-ver" className="af-cta-ghost">
            Dónde ver la jornada
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
