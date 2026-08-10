import Image from 'next/image';
import { ligaMxLeagueLogoSrc } from '@/config/ligaMxLogos';

type Props = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
};

/** Square league badge (~1500×1500). */
const PX = { sm: 28, md: 48, lg: 72 } as const;

/** Official Liga MX mark for AF surfaces. */
export function LigaMxMark({
  className = '',
  size = 'md',
  priority = false,
}: Props) {
  const px = PX[size];

  return (
    <Image
      src={ligaMxLeagueLogoSrc()}
      alt="Liga MX"
      width={px}
      height={px}
      priority={priority}
      data-testid="lm-mark"
      className={['lm-mark', className].filter(Boolean).join(' ')}
    />
  );
}
