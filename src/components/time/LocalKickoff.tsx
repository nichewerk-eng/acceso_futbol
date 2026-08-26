'use client';

import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import {
  formatKickoffDay,
  formatKickoffFull,
  formatKickoffLong,
  formatKickoffTime,
} from '@/lib/localTime';

type Variant = 'time' | 'day' | 'long' | 'full';

export function LocalKickoff({
  iso,
  variant = 'long',
  className,
}: {
  iso: string;
  variant?: Variant;
  className?: string;
}) {
  const tz = useDeviceTimeZone();
  const label =
    variant === 'time'
      ? formatKickoffTime(iso, tz)
      : variant === 'day'
        ? formatKickoffDay(iso, tz)
        : variant === 'full'
          ? formatKickoffFull(iso, tz)
          : formatKickoffLong(iso, tz);

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
