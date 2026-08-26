'use client';

import { useEffect, useState } from 'react';
import { DEVICE_TZ_FALLBACK, readDeviceTimeZone } from '@/lib/localTime';

/** Device IANA zone. SSR + first paint use Mexico City, then the viewer zone. */
export function useDeviceTimeZone(): string {
  const [tz, setTz] = useState(DEVICE_TZ_FALLBACK);
  useEffect(() => {
    setTz(readDeviceTimeZone());
  }, []);
  return tz;
}
