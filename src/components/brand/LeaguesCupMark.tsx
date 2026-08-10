import Image from 'next/image';
import { LEAGUES_CUP_LOGO } from '@/config/leaguesCup2026';

type Props = {
  className?: string;
  /** paper = dark mark on light AF surfaces; ink = light mark on dark heroes */
  surface?: 'paper' | 'ink';
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
};

/** Asset is ~600×122 — keep width from height. */
const HEIGHT = { sm: 20, md: 36, lg: 52 } as const;

/** Official Leagues Cup wordmark for AF paper / ink surfaces. */
export function LeaguesCupMark({
  className = '',
  surface = 'paper',
  size = 'md',
  priority = false,
}: Props) {
  const h = HEIGHT[size];
  const w = Math.round((h * 600) / 122);

  return (
    <Image
      src={LEAGUES_CUP_LOGO}
      alt="Leagues Cup"
      width={w}
      height={h}
      priority={priority}
      data-testid="lc-mark"
      className={[
        'lc-mark',
        surface === 'paper' ? 'lc-mark-paper' : 'lc-mark-ink',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
