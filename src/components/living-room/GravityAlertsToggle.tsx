'use client';

import { disableGravityAlerts, enableGravityAlerts } from '@/lib/client/gravityAlerts';
import { useGravityAlertPref } from '@/lib/client/useGravityAlerts';
import { useGravity } from '@/contexts/GravityContext';

export function GravityAlertsToggle() {
  const on = useGravityAlertPref();
  const { settled, club, elTri } = useGravity();
  if (!settled || !(club || elTri)) return null;

  async function toggle() {
    if (on) {
      disableGravityAlerts();
      return;
    }
    await enableGravityAlerts();
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      data-testid="gravity-alerts-toggle"
      className={[
        'font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition',
        on ? 'text-signal' : 'text-muted hover:text-foreground',
      ].join(' ')}
      title={on ? 'Avisos de gol y saque para tu club' : 'Activar avisos de gol y saque'}
    >
      Avisos {on ? 'ON' : 'OFF'}
    </button>
  );
}
