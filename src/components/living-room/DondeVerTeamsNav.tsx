import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { LIGA_MX_CLUBS } from '@/config/clubs';

/** Indexable internal links to every per-team "dónde ver" page. Server component. */
export function DondeVerTeamsNav({
  activeSlug,
  className = '',
}: {
  activeSlug?: string;
  className?: string;
}) {
  const clubs = [...LIGA_MX_CLUBS].sort((a, b) => a.name.localeCompare(b.name, 'es'));

  return (
    <nav className={['dv-teams-block', className].filter(Boolean).join(' ')} aria-label="Dónde ver por equipo">
      <p className="af-tele text-foreground">
        <span className="text-signal">AF</span>
        ://POR-EQUIPO
      </p>
      <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-wide">
        Por equipo
      </h2>
      <p className="mt-1 font-mono text-[11px] leading-5 text-muted">
        Guía de un club: próximo partido y canal.
      </p>
      <ul className="dv-teams">
        {clubs.map((c) => (
          <li key={c.id}>
            <Link
              href={`/donde-ver/${c.id}`}
              className={[
                'dv-team-chip',
                c.id === activeSlug ? 'dv-team-chip-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={c.id === activeSlug ? 'page' : undefined}
            >
              <ClubLogo abbr={c.abbreviation} clubId={c.id} name={c.name} size="xs" />
              <span>{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
