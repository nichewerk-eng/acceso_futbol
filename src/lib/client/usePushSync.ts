'use client';

import { useEffect } from 'react';
import { useGravity } from '@/contexts/GravityContext';
import { pushSupported, registerPushSw, syncPushPrefs } from '@/lib/client/push';
import { useGravityAlertPref } from '@/lib/client/useGravityAlerts';

/**
 * Keeps the server-side push subscription's targeting in sync with the user's
 * gravity selection. Runs whenever alerts are on and club / El Tri change, so
 * switching favorite club updates which fixtures push (no permission prompt —
 * only re-sends prefs for an existing subscription). Also (re)registers the SW.
 */
export function usePushSync() {
  const on = useGravityAlertPref();
  const { clubId, elTri, settled } = useGravity();

  useEffect(() => {
    if (!pushSupported() || !on || !settled) return;
    void registerPushSw()
      .then(() => syncPushPrefs({ clubId: clubId ?? null, elTri }))
      .catch(() => {});
  }, [on, settled, clubId, elTri]);
}
