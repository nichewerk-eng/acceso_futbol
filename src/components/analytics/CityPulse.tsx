'use client';

import { useEffect } from 'react';

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
      .then(() => {
        try {
          sessionStorage.setItem(KEY, '1');
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  return null;
}
