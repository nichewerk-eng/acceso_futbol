'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { SOCIAL_CHANNELS } from '@/config/site';

export function SeguirMenu({
  className = '',
  testId = 'nav-seguir',
}: {
  className?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={['af-seguir', className].filter(Boolean).join(' ')} ref={rootRef} data-testid={testId}>
      <button
        type="button"
        className="af-cta !px-3 !py-2"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        Seguir
      </button>
      {open ? (
        <ul id={menuId} role="menu" className="af-seguir-panel" aria-label="Redes Acceso">
          {SOCIAL_CHANNELS.map((ch) => (
            <li key={ch.id} role="none">
              <a
                href={ch.href}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                className="af-seguir-link"
                data-testid={`nav-social-${ch.id}`}
                onClick={() => setOpen(false)}
              >
                <span className="af-seguir-net">{ch.label}</span>
                <span className="af-seguir-handle">{ch.handle}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
