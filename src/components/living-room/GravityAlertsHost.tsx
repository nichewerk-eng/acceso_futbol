'use client';

import { dismissGravityToast } from '@/lib/client/gravityAlerts';
import { useGravityAlertWatcher, useGravityToasts } from '@/lib/client/useGravityAlerts';
import { usePushSync } from '@/lib/client/usePushSync';

/** Keeps LOCK’d kick/goal avisos alive across pages and paints in-page toasts. */
export function GravityAlertsHost() {
  useGravityAlertWatcher();
  usePushSync();
  const toasts = useGravityToasts();

  if (!toasts.length) return null;

  return (
    <div
      data-testid="gravity-alerts-stack"
      className="pointer-events-none fixed top-16 right-3 z-[80] flex w-[min(100%-1.5rem,22rem)] flex-col gap-2 sm:top-20"
    >
      {toasts.map((t) => (
        <article
          key={t.id}
          data-testid="gravity-alert-toast"
          className="pointer-events-auto border border-signal bg-[#1e223d] px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        >
          <p className="af-tele text-signal">AVISO</p>
          <p className="mt-1 font-display text-lg font-bold uppercase tracking-wide text-[#f6f5f2]">
            {t.title}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-white/55">{t.body}</p>
          <div className="mt-3 flex items-center gap-3">
            {t.href ? (
              <a
                href={t.href}
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-signal hover:text-[#f6f5f2]"
              >
                Abrir partido
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => dismissGravityToast(t.id)}
              className="ml-auto font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-signal hover:text-[#f6f5f2]"
            >
              Cerrar
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
