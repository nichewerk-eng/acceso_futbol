'use client';

import { useEffect } from 'react';

/** Opens a collapsed jornada when arriving via #jornada-N. */
export function HorariosHashOpen() {
  useEffect(() => {
    const openHash = () => {
      const id = window.location.hash.replace('#', '');
      if (!id) return;
      const section = document.getElementById(id);
      const details = section?.querySelector('details');
      if (details) details.open = true;
    };
    openHash();
    window.addEventListener('hashchange', openHash);
    return () => window.removeEventListener('hashchange', openHash);
  }, []);
  return null;
}
