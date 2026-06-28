'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface FavoriteTeam {
  id: string;
  name: string;
  abbreviation: string;
  league: 'mundial' | 'liga-mx';
}

interface TeamContextValue {
  favorites: FavoriteTeam[];
  addFavorite: (team: FavoriteTeam) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const TeamContext = createContext<TeamContextValue>({
  favorites: [],
  addFavorite: () => {},
  removeFavorite: () => {},
  isFavorite: () => false,
});

const STORAGE_KEY = 'af-favorites';

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteTeam[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setFavorites(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((next: FavoriteTeam[]) => {
    setFavorites(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const addFavorite = useCallback((team: FavoriteTeam) => {
    setFavorites((prev) => {
      if (prev.some((t) => t.id === team.id)) return prev;
      const next = [...prev, team];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((t) => t.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.some((t) => t.id === id), [favorites]);

  // suppress unused warning
  void save;

  return (
    <TeamContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() { return useContext(TeamContext); }
