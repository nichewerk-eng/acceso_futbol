import Link from 'next/link';
import type { ReactNode } from 'react';
import { clubHrefFromAbbr } from '@/config/clubIdentity';

type Props = {
  abbr?: string | null;
  className?: string;
  title?: string;
  children: ReactNode;
};

/** Wraps children in a club-sala link when the abbreviation maps to a Liga MX / El Tri room. */
export function ClubLink({ abbr, className, title, children }: Props) {
  const href = clubHrefFromAbbr(abbr);
  if (!href) return <span className={className}>{children}</span>;
  const slug = href.slice('/club/'.length);
  return (
    <Link
      href={href}
      className={className}
      title={title}
      data-testid={`club-link-${slug}`}
    >
      {children}
    </Link>
  );
}
