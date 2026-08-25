'use client';

import { useEffect } from 'react';
import { trackGa } from '@/lib/analytics/trackClient';

const KEY = 'af-city-pulse-v1';

/** Once per tab session, send Vercel geo to Analytics as event `City`. */
export function CityPulse() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      /* private mode — ping this mount */
    }
    void fetch('/api/analytics/geo', { method: 'POST', keepalive: true })
      .then(async (res) => {
        try {
          sessionStorage.setItem(KEY, '1');
        } catch {
          /* ignore */
        }
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as {
          city?: string;
          country?: string;
        } | null;
        if (data?.city) {
          trackGa('City', { city: data.city, country: data.country ?? '' });
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  return null;
}
