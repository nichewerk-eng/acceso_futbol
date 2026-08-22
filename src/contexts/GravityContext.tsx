'use client';

import { EL_TRI, LIGA_MX_CLUBS, type GravityClub } from '@/config/clubs';
import { gravityMatches } from '@/config/clubMatch';
import { trackClient } from '@/lib/analytics/trackClient';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type GravityState = {
  clubId: string | null;
  elTri: boolean;
  /** User finished or skipped claim */
  settled: boolean;
};

type GravityContextValue = GravityState & {
  club: GravityClub | null;
  setClub: (clubId: string | null) => void;
  setElTri: (on: boolean) => void;
  settle: () => void;
  skip: () => void;
  reset: () => void;
  matchesGravity: (homeName: string, awayName: string, homeAbbr?: string, awayAbbr?: string) => boolean;
};

const STORAGE_KEY = 'af-gravity-v1';
const DEFAULT: GravityState = { clubId: null, elTri: false, settled: false };

const GravityContext = createContext<GravityContextValue>({
  ...DEFAULT,
  club: null,
  setClub: () => {},
  setElTri: () => {},
  settle: () => {},
  skip: () => {},
  reset: () => {},
  matchesGravity: () => false,
});

function load(): GravityState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as GravityState;
    return {
      clubId: parsed.clubId ?? null,
      elTri: Boolean(parsed.elTri),
      settled: Boolean(parsed.settled),
    };
  } catch {
    return DEFAULT;
  }
}

function persist(next: GravityState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function GravityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GravityState>(DEFAULT);

  useEffect(() => {
    setState(load());
  }, []);

  const patch = useCallback((partial: Partial<GravityState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      persist(next);
      return next;
    });
  }, []);

  const club = useMemo(
    () => LIGA_MX_CLUBS.find((c) => c.id === state.clubId) ?? null,
    [state.clubId]
  );

  const setClub = useCallback(
    (clubId: string | null) => {
      if (clubId) trackClient('Lock', { club: clubId });
      patch({ clubId, settled: true });
    },
    [patch]
  );

  const setElTri = useCallback((on: boolean) => {
    if (on) trackClient('Lock El Tri');
    patch({ elTri: on, settled: true });
  }, [patch]);
  const settle = useCallback(() => patch({ settled: true }), [patch]);
  const skip = useCallback(() => {
    trackClient('Skip claim');
    patch({ settled: true });
  }, [patch]);
  const reset = useCallback(() => {
    persist(DEFAULT);
    setState(DEFAULT);
  }, []);

  const matchesGravity = useCallback(
    (homeName: string, awayName: string, homeAbbr = '', awayAbbr = '') =>
      gravityMatches(club, state.elTri, homeName, awayName, homeAbbr, awayAbbr),
    [club, state.elTri]
  );

  const value = useMemo(
    () => ({
      ...state,
      club,
      setClub,
      setElTri,
      settle,
      skip,
      reset,
      matchesGravity,
    }),
    [state, club, setClub, setElTri, settle, skip, reset, matchesGravity]
  );

  return <GravityContext.Provider value={value}>{children}</GravityContext.Provider>;
}

export function useGravity() {
  return useContext(GravityContext);
}

export { EL_TRI, LIGA_MX_CLUBS };
