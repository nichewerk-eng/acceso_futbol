'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { useTeam } from '@/contexts/TeamContext';
import { LIGA_MX_CLUBS } from '@/config/clubs';
import { teamNameEs } from '@/components/standings/teamNames';
import SiteNav from '@/components/SiteNav';

const LIGAMX_TEAMS = LIGA_MX_CLUBS;

export default function MiEquipoPage() {
  const { favorites, addFavorite, removeFavorite, isFavorite } = useTeam();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const ligaFavorites = favorites.filter((t) => t.league === 'liga-mx');

  return (
    <>
      <SiteNav />
      <div className="min-h-screen bg-bg-1 dark:bg-bg-1 font-display text-brand-blue dark:text-white">

        {/* Header */}
        <div className="bg-brand-blue px-4 py-8">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-2xl font-bold text-white">Mi Equipo</h1>
            <p className="mt-1 text-sm text-white/40">Sigue tus equipos favoritos de Liga MX</p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 pb-16 sm:px-6 space-y-8">

          {/* Favorites */}
          {mounted && ligaFavorites.length > 0 && (
            <section>
              <h2 className="text-sm font-bold tracking-wider uppercase text-gray-500 dark:text-white/50 mb-4">Mis favoritos</h2>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                {ligaFavorites.map((team) => (
                  <div key={team.id} className="relative rounded-2xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-4 text-center">
                    <button
                      onClick={() => removeFavorite(team.id)}
                      className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 text-[10px] hover:bg-red-100 hover:text-red-500 transition"
                      aria-label="Quitar"
                    >✕</button>
                    <span className="mb-1.5 flex justify-center">
                      <ClubLogo clubId={team.id} abbr={team.abbreviation} name={team.name} size="lg" />
                    </span>
                    <p className="text-xs font-semibold text-brand-blue dark:text-white">{teamNameEs(team.name)}</p>
                    <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">Liga MX</p>
                    <Link
                      href={`/club/${team.id}`}
                      className="mt-2 block text-[10px] font-bold text-brand-orange hover:underline"
                    >
                      Sala del club →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Team browser */}
          <section>
            <h2 className="text-sm font-bold tracking-wider uppercase text-gray-500 dark:text-white/50 mb-4">Agregar equipo</h2>

            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {LIGAMX_TEAMS.map((team) => {
                const fav = mounted && isFavorite(team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() =>
                      fav
                        ? removeFavorite(team.id)
                        : addFavorite({
                            id: team.id,
                            name: team.name,
                            abbreviation: team.abbreviation,
                            league: 'liga-mx',
                          })
                    }
                    className={['rounded-xl border px-3 py-3 text-left transition group',
                      fav ? 'border-brand-orange/40 bg-brand-orange/5' : 'border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:border-brand-orange/30 hover:bg-brand-orange/5'].join(' ')}
                  >
                    <span className="mb-1.5 flex">
                      <ClubLogo clubId={team.id} abbr={team.abbreviation} name={team.name} size="md" />
                    </span>
                    <p className="text-xs font-semibold text-brand-blue dark:text-white truncate">{teamNameEs(team.name)}</p>
                    <p className="text-[10px] mt-1 font-semibold transition">
                      {fav ? <span className="text-brand-orange">Siguiendo ✓</span> : <span className="text-gray-400 dark:text-white/30 group-hover:text-brand-orange">+ Seguir</span>}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Footer links */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
            <Link href="/" className="text-xs text-gray-400 dark:text-white/30 hover:text-brand-orange transition">Pulso</Link>
            <Link href="/liga-mx" className="text-xs text-gray-400 dark:text-white/30 hover:text-brand-orange transition">Liga MX</Link>
          </div>
        </div>
      </div>
    </>
  );
}
