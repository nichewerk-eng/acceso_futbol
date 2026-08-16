import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { LIGA_MX_CLUBS } from '@/config/clubs';

/** Indexable internal links to every per-team "dónde ver" page. Server component. */
export function DondeVerTeamsNav({ activeSlug }: { activeSlug?: string }) {
  return (
    <nav className="mt-8" aria-label="Dónde ver por equipo">
      <p className="af-tele text-foreground">
        <span className="text-signal">AF</span>
        ://POR-EQUIPO
      </p>
      <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-wide">
        Dónde ver por equipo
      </h2>
      <ul className="dv-teams mt-3">
        {LIGA_MX_CLUBS.map((c) => (
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
