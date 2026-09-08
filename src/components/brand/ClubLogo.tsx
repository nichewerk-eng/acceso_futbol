import { ligaMxCrestById, ligaMxLogoSrc, seleccionLogoSrc } from '@/config/ligaMxLogos';
import { mlsLogoSrc } from '@/config/mlsLogos';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const PX: Record<Size, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 64,
  xl: 88,
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

/**
 * Resolve crest without CHI/COL collisions between selección and MLS.
 * Explicit logoUrl (El Tri board) and numeric SM ids win; MLS abbr before
 * selección abbr so Chicago Fire / Columbus keep their crests.
 */
export function ClubLogo({ abbr, clubId, name, logoUrl, size = 'sm', className = '' }: Props) {
  const smId = clubId && /^\d+$/.test(clubId.trim()) ? clubId.trim() : null;
  const src =
    ligaMxCrestById(clubId) ??
    (smId ? mlsLogoSrc(smId) : null) ??
    logoUrl ??
    mlsLogoSrc(clubId) ??
    mlsLogoSrc(abbr) ??
    seleccionLogoSrc(abbr) ??
    ligaMxLogoSrc(abbr) ??
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
