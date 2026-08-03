import { ligaMxLogoSrc } from '@/config/ligaMxLogos';
import { mlsLogoSrc } from '@/config/mlsLogos';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const PX: Record<Size, number> = {
  xs: 22,
  sm: 28,
  md: 36,
  lg: 52,
  xl: 72,
};

type Props = {
  abbr?: string | null;
  clubId?: string | null;
  name?: string;
  /** Remote crest when local Liga MX / MLS asset missing. */
  logoUrl?: string | null;
  size?: Size;
  className?: string;
};

/** Local Liga MX / MLS crest, then remote logo, then abbreviation text. */
export function ClubLogo({ abbr, clubId, name, logoUrl, size = 'sm', className = '' }: Props) {
  // MLS SM ids / CHI (Chicago Fire) before Liga MX abbr aliases (CHI→Chivas on ESPN only).
  const src =
    mlsLogoSrc(clubId) ??
    ligaMxLogoSrc(clubId) ??
    mlsLogoSrc(abbr) ??
    ligaMxLogoSrc(abbr) ??
    logoUrl ??
    null;
  const px = PX[size];
  const label = name || abbr || 'Club';

  if (!src) {
    return (
      <span
        className={[
          'inline-flex shrink-0 items-center justify-center font-display font-bold uppercase tracking-wide text-muted',
          size === 'xs' ? 'text-[10px]' : 'text-xs',
          className,
        ].join(' ')}
        aria-hidden={!abbr}
      >
        {abbr ?? '-'}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local/remote crests; keep simple img
    <img
      src={src}
      alt=""
      width={px}
      height={px}
      loading="lazy"
      decoding="async"
      className={['club-logo', `club-logo-${size}`, className].filter(Boolean).join(' ')}
      title={label}
    />
  );
}
