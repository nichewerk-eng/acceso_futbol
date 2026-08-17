'use client';

import { disableGravityAlerts, enableGravityAlerts } from '@/lib/client/gravityAlerts';
import { subscribeToPush, unsubscribeFromPush } from '@/lib/client/push';
import { useGravityAlertPref } from '@/lib/client/useGravityAlerts';
import { useGravity } from '@/contexts/GravityContext';

export function GravityAlertsToggle({
  className = '',
  testId = 'gravity-alerts-toggle',
}: {
  className?: string;
  testId?: string;
}) {
  const on = useGravityAlertPref();
  const { settled, club, elTri, clubId } = useGravity();
  if (!settled || !(club || elTri)) return null;

  async function toggle() {
    if (on) {
      disableGravityAlerts();
      void unsubscribeFromPush();
      return;
    }
    await enableGravityAlerts();
    // Register a real Web Push subscription too, so goals/kickoffs arrive with the tab closed.
    void subscribeToPush({ clubId: clubId ?? null, elTri });
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      data-testid={testId}
      className={[
        'font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition',
        on ? 'text-signal' : 'text-muted hover:text-foreground',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={on ? 'Avisos de gol y saque para tu club' : 'Activar avisos de gol y saque'}
    >
      Avisos {on ? 'ON' : 'OFF'}
    </button>
  );
}
