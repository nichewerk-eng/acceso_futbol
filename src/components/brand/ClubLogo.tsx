import { ligaMxLogoSrc } from '@/config/ligaMxLogos';

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
  size?: Size;
  className?: string;
};

/** Local Liga MX crest. Falls back to abbreviation text if unknown. */
export function ClubLogo({ abbr, clubId, name, size = 'sm', className = '' }: Props) {
  const src = ligaMxLogoSrc(clubId) ?? ligaMxLogoSrc(abbr);
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
        {abbr ?? '—'}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local crest assets; keep simple img
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
