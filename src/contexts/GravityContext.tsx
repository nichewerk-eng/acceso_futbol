'use client';

import { EL_TRI, LIGA_MX_CLUBS, type GravityClub } from '@/config/clubs';
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

function nameHits(hay: string, club: GravityClub): boolean {
  const h = hay.toLowerCase();
  return (
    h.includes(club.name.toLowerCase()) ||
    h.includes(club.abbreviation.toLowerCase()) ||
    (club.id === 'chivas' && (h.includes('guadalajara') || h.includes('chivas'))) ||
    (club.id === 'america' && (h.includes('américa') || h.includes('america'))) ||
    (club.id === 'atlante' && h.includes('atlante')) ||
    (club.id === 'san-luis' && (h.includes('san luis') || h.includes('sanluis')))
  );
}

/** ESPN Apertura 2026 abbr (+ legacy aliases) for this gravity club. */
function abbrHits(abbr: string, club: GravityClub): boolean {
  const a = abbr.toUpperCase();
  if (a === club.abbreviation) return true;
  if (club.id === 'chivas' && (a === 'GDL' || a === 'CHI' || a === 'GUA')) return true;
  if (club.id === 'san-luis' && (a === 'ASL' || a === 'SLP')) return true;
  if (club.id === 'necaxa' && (a === 'NCX' || a === 'NEC' || a === 'NXA')) return true;
  if (club.id === 'pumas' && (a === 'UNAM' || a === 'PUM')) return true;
  if (club.id === 'tigres' && (a === 'UANL' || a === 'TIG' || a === 'TUA')) return true;
  if (club.id === 'atlas' && a === 'ATS') return true;
  if (club.id === 'atlante' && (a === 'ATL' || a === 'ALT')) return true;
  if (club.id === 'santos' && (a === 'SAN' || a === 'SLA')) return true;
  if (club.id === 'monterrey' && (a === 'MTY' || a === 'MNT')) return true;
  if (club.id === 'pachuca' && (a === 'PAC' || a === 'PCH')) return true;
  return false;
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
    (clubId: string | null) => patch({ clubId, settled: true }),
    [patch]
  );

  const setElTri = useCallback((on: boolean) => patch({ elTri: on, settled: true }), [patch]);
  const settle = useCallback(() => patch({ settled: true }), [patch]);
  const skip = useCallback(() => patch({ settled: true }), [patch]);
  const reset = useCallback(() => {
    persist(DEFAULT);
    setState(DEFAULT);
  }, []);

  const matchesGravity = useCallback(
    (homeName: string, awayName: string, homeAbbr = '', awayAbbr = '') => {
      if (state.elTri) {
        const blob = `${homeName} ${awayName} ${homeAbbr} ${awayAbbr}`.toLowerCase();
        if (blob.includes('mexic') || homeAbbr === 'MEX' || awayAbbr === 'MEX') return true;
      }
      if (!club) return false;
      return (
        nameHits(homeName, club) ||
        nameHits(awayName, club) ||
        abbrHits(homeAbbr, club) ||
        abbrHits(awayAbbr, club)
      );
    },
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
