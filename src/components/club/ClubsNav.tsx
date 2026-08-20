import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { LIGA_MX_CLUBS } from '@/config/clubs';

type Props = {
  activeSlug?: string;
  className?: string;
  title?: string;
  dek?: string | null;
};

/** Directory of Liga MX salas. Browse-only — does not claim gravity. */
export function ClubsNav({
  activeSlug,
  className = '',
  title = 'Salas',
  dek = 'Partidos, pulso y cobertura de cada club de Liga MX.',
}: Props) {
  return (
    <section
      id="clubes"
      className={['clubs-nav', className].filter(Boolean).join(' ')}
      data-testid="clubs-nav"
      aria-label="Salas de club"
    >
      <p className="af-tele text-foreground">
        <span className="text-signal">AF</span>
        ://CLUBES
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        {title}
      </h2>
      {dek ? (
        <p className="mt-2 max-w-lg font-mono text-[12px] leading-6 text-muted">{dek}</p>
      ) : null}

      <div className="af-club-pad mt-6" data-testid="clubs-nav-pad">
        {LIGA_MX_CLUBS.map((c) => {
          const active = activeSlug === c.id;
          return (
            <Link
              key={c.id}
              href={`/club/${c.id}`}
              data-testid={`clubs-nav-${c.id}`}
              className={['af-club-btn', active ? 'is-on' : ''].join(' ')}
              aria-current={active ? 'page' : undefined}
              aria-label={c.name}
              title={c.name}
            >
              <ClubLogo clubId={c.id} abbr={c.abbreviation} name={c.name} size="xs" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
