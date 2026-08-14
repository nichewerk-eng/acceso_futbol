'use client';

import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import type { ComponentProps } from 'react';

function PendingMark() {
  const { pending } = useLinkStatus();
  return (
    <span
      className={['match-link-pending', pending ? 'is-on' : ''].filter(Boolean).join(' ')}
      aria-hidden
    >
      <span className="match-skel-spinner match-skel-spinner-sm" />
    </span>
  );
}

/** Match card link with a spinner while the partido route is still pending. */
export function PartidoLink({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={['match-partido-link', className].filter(Boolean).join(' ')}
    >
      {children}
      <PendingMark />
    </Link>
  );
}
