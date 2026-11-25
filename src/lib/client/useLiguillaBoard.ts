'use client';

import { useEffect, useRef, useState } from 'react';
import { liveFetch } from '@/lib/client/liveFetch';
import { startLivePoll } from '@/lib/client/livePoll';
import { paceFromFixtures, type FreshPace } from '@/lib/sports/freshness';
import { liguillaFixtures } from '@/lib/sports/liguilla';
import type { LiguillaPayload } from '@/lib/sports/liguillaBoard';

function isBoard(d: unknown): d is LiguillaPayload {
  return Boolean(d && typeof d === 'object' && 'rounds' in d && 'seeds' in d);
}

/** Liguilla board with adaptive polling; `initial` is the SSR payload. */
export function useLiguillaBoard(initial: LiguillaPayload | null) {
  const [board, setBoard] = useState<LiguillaPayload | null>(initial);
  const pace = useRef<FreshPace>(initial ? paceFromFixtures(liguillaFixtures(initial)) : 'near');

  useEffect(
    () =>
      startLivePoll(
        () => {
          void liveFetch('/api/ligamx/liguilla')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (!isBoard(d)) return;
              pace.current = paceFromFixtures(liguillaFixtures(d));
              setBoard(d);
            })
            .catch(() => {});
        },
        { getPace: () => pace.current, immediate: !initial }
      ),
    [initial]
  );

  return board;
}
