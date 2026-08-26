import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { SiteFooter } from '@/components/home/SiteFooter';
import { DondeVerAir } from '@/components/living-room/DondeVerAir';
import { DondeVerTeamsNav } from '@/components/living-room/DondeVerTeamsNav';
import { PulseNav } from '@/components/living-room/PulseNav';
import { JsonLd } from '@/components/seo/JsonLd';
import { LocalKickoff } from '@/components/time/LocalKickoff';
import { LIGA_MX_CLUBS } from '@/config/clubs';
import { clubIdentityFromAbbr, getClubIdentity } from '@/config/clubIdentity';
import {
  fixtureChannelLabels,
  kickoffLabelMx,
  teamDondeVerFaq,
} from '@/lib/dondeVerCopy';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  sportsEventJsonLd,
  webPageJsonLd,
} from '@/lib/seo';
import { getTeamBroadcastSchedule } from '@/lib/sports/dondeVerTeam';
import type { Fixture } from '@/lib/sports/types';

// Schedules move slowly; channels are the payload. Revalidate a few times/hour.
export const revalidate = 300;

export function generateStaticParams() {
  return LIGA_MX_CLUBS.map((c) => ({ equipo: c.id }));
}

type PageParams = { params: Promise<{ equipo: string }> };

function truncate(text: string, max = 155): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { equipo } = await params;
  const club = getClubIdentity(equipo);
  if (!club || club.league !== 'liga-mx') {
    return { title: 'Dónde ver · Liga MX', robots: { index: false } };
  }

  const sched = await getTeamBroadcastSchedule(equipo).catch(() => null);
  const next = sched?.next ?? null;
  const path = `/donde-ver/${equipo}`;
  const title = `Dónde ver ${club.name} hoy · Canal y horario · Liga MX`;

  let description = `En qué canal y a qué hora ver a ${club.name} en la Liga MX, en México y Estados Unidos.`;
  if (next) {
    const clubIsHome = clubIdentityFromAbbr(next.home.abbreviation)?.id === club.id;
    const opp = clubIsHome ? next.away.name : next.home.name;
    const { mx, us } = fixtureChannelLabels(next);
    const where = [mx ? `MX: ${mx}` : '', us ? `US: ${us}` : ''].filter(Boolean).join('. ');
    description = truncate(
      `${club.name} vs ${opp}: ${kickoffLabelMx(next.date)} (hora del centro). ${where}${
        where ? '. ' : ''
      }Dónde ver a ${club.name} en México y Estados Unidos.`
    );
  }

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { title, description, url: absoluteUrl(path), type: 'website', locale: 'es_MX' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function MatchRow({ f }: { f: Fixture }) {
  const live = f.state === 'in';
  const post = f.state === 'post';
  const { mx, us } = fixtureChannelLabels(f);
  const confirmed = Boolean(mx || us);

  return (
    <Link
      href={`/partido/liga-mx/${f.id}`}
      className={['dv-row', live ? 'dv-row-live' : ''].filter(Boolean).join(' ')}
    >
      <div className="dv-row-meta">
        <p className="dv-kick">
          {live ? (
            <>
              <span className="hoy-live-dot" aria-hidden />
              {f.clock || 'EN VIVO'}
            </>
          ) : post ? (
            'FT'
          ) : (
            <LocalKickoff iso={f.date} variant="long" />
          )}
        </p>
      </div>

      <div className="dv-pair">
        <span className="dv-side">
          <ClubLogo abbr={f.home.abbreviation} name={f.home.name} size="sm" />
          <span className="dv-abbr">{f.home.abbreviation}</span>
        </span>
        <span className="dv-mid">
          {live || post ? `${f.home.score ?? 0}–${f.away.score ?? 0}` : 'vs'}
        </span>
        <span className="dv-side dv-side-away">
          <span className="dv-abbr">{f.away.abbreviation}</span>
          <ClubLogo abbr={f.away.abbreviation} name={f.away.name} size="sm" />
        </span>
      </div>

      {confirmed ? (
        <DondeVerAir
          mx={f.dondeVer?.mxChannels}
          us={f.dondeVer?.usChannels}
          mxLabel={f.dondeVer?.mx}
          usLabel={f.dondeVer?.us}
        />
      ) : (
        <p className="dv-pending">Por confirmar · MX ↔ US</p>
      )}
    </Link>
  );
}

export default async function DondeVerTeamPage({ params }: PageParams) {
  const { equipo } = await params;
  const club = getClubIdentity(equipo);
  if (!club || club.league !== 'liga-mx') notFound();

  const sched = await getTeamBroadcastSchedule(equipo).catch(() => null);
  const next = sched?.next ?? null;
  const upcoming = sched?.upcoming ?? [];
  const recent = sched?.recent ?? [];
  const path = `/donde-ver/${equipo}`;
  const matchesAbbr = (abbr: string) => clubIdentityFromAbbr(abbr)?.id === club.id;
  const faq = teamDondeVerFaq(club, next, matchesAbbr);

  const nextOpp = next
    ? matchesAbbr(next.home.abbreviation)
      ? next.away
      : next.home
    : null;
  const nextLive = next?.state === 'in';

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Dónde ver', path: '/donde-ver' },
            { name: club.name, path },
          ]),
          webPageJsonLd({
            name: `Dónde ver ${club.name} hoy`,
            path,
            description: `En qué canal y a qué hora ver a ${club.name} en la Liga MX.`,
            speakableSelectors: ['h1', '.dv-next'],
          }),
          ...(next ? [sportsEventJsonLd(next, 'liga-mx')] : []),
          ...(faq.length ? [faqPageJsonLd(faq)] : []),
        ]}
      />
      <PulseNav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://DONDE-VER
        </p>
        <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">
          <ClubLogo abbr={club.abbreviation} clubId={club.id} name={club.name} size="lg" />
          Dónde ver {club.name}
        </h1>
        <p className="mt-3 max-w-2xl font-mono text-[12px] leading-6 text-muted">
          Canal y horario del próximo partido de {club.name} en la Liga MX, en México y Estados
          Unidos. Horario en la zona de tu dispositivo.
        </p>

        {next && nextOpp ? (
          <section className={['dv-next', 'mt-6', nextLive ? 'dv-next-live' : ''].join(' ')}>
            <p className="af-tele text-foreground">
              {nextLive ? (
                <>
                  <span className="hoy-live-dot" aria-hidden /> En vivo
                </>
              ) : (
                'Próximo partido'
              )}
            </p>
            <div className="dv-next-pair">
              <span className="dv-next-side">
                <ClubLogo abbr={next.home.abbreviation} name={next.home.name} size="lg" />
                <span className="dv-next-abbr">{next.home.abbreviation}</span>
              </span>
              <span className="dv-next-vs">
                {nextLive || next.state === 'post'
                  ? `${next.home.score ?? 0}–${next.away.score ?? 0}`
                  : 'vs'}
              </span>
              <span className="dv-next-side">
                <ClubLogo abbr={next.away.abbreviation} name={next.away.name} size="lg" />
                <span className="dv-next-abbr">{next.away.abbreviation}</span>
              </span>
            </div>
            <p className="mt-1 text-center font-mono text-[12px] uppercase tracking-wide text-muted">
              {nextLive ? next.clock || 'EN VIVO' : <LocalKickoff iso={next.date} variant="long" />}
              {next.venue ? ` · ${next.venue}` : ''}
            </p>
            <div className="mt-4 flex justify-center">
              <DondeVerAir
                mx={next.dondeVer?.mxChannels}
                us={next.dondeVer?.usChannels}
                mxLabel={next.dondeVer?.mx}
                usLabel={next.dondeVer?.us}
              />
            </div>
            <div className="mt-5 flex justify-center">
              <Link href={`/partido/liga-mx/${next.id}`} className="af-cta">
                Ver el partido
              </Link>
            </div>
          </section>
        ) : (
          <section className="dv-next mt-6">
            <p className="font-mono text-[12px] leading-6 text-muted">
              {club.name} no tiene un partido próximo confirmado. Revisa la{' '}
              <Link href="/donde-ver" className="underline">
                guía completa de la jornada
              </Link>
              .
            </p>
          </section>
        )}

        {upcoming.length > 1 ? (
          <section className="dv-guide mt-8">
            <div className="dv-guide-head">
              <div>
                <p className="af-tele text-foreground">
                  <span className="text-signal">AF</span>
                  ://CALENDARIO
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide">
                  Próximos partidos
                </h2>
              </div>
            </div>
            <div className="dv-list">
              {upcoming.slice(0, 8).map((f) => (
                <MatchRow key={f.id} f={f} />
              ))}
            </div>
          </section>
        ) : null}

        {recent.length ? (
          <section className="dv-guide mt-8">
            <div className="dv-guide-head">
              <div>
                <p className="af-tele text-foreground">
                  <span className="text-signal">AF</span>
                  ://RESULTADOS
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide">
                  Últimos resultados
                </h2>
              </div>
            </div>
            <div className="dv-list">
              {recent.map((f) => (
                <MatchRow key={f.id} f={f} />
              ))}
            </div>
          </section>
        ) : null}

        {faq.length ? (
          <section className="mt-8" aria-label="Preguntas frecuentes">
            <p className="af-tele text-foreground">
              <span className="text-signal">AF</span>
              ://FAQ
            </p>
            <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-wide">
              Preguntas frecuentes
            </h2>
            <dl className="mt-4 space-y-4">
              {faq.map((item) => (
                <div key={item.question} className="border-b border-line pb-4">
                  <dt className="font-display text-base font-semibold">{item.question}</dt>
                  <dd className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <div className="mt-8">
          <Link href={`/club/${club.id}`} className="af-tele underline">
            Ver todo sobre {club.name}
          </Link>
        </div>

        <DondeVerTeamsNav activeSlug={club.id} className="mt-8" />
      </main>
      <SiteFooter />
    </div>
  );
}
