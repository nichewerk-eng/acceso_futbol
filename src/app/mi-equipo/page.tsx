'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTeam } from '@/contexts/TeamContext';
import { teamNameEs } from '@/components/standings/teamNames';
import SiteNav from '@/components/SiteNav';

// Hard-coded Liga MX teams so users can browse without needing live API data
const LIGAMX_TEAMS = [
  { id: 'america',    name: 'Club América',       abbreviation: 'AME', league: 'liga-mx' as const },
  { id: 'chivas',     name: 'Chivas',              abbreviation: 'CHI', league: 'liga-mx' as const },
  { id: 'guadalajara',name: 'Guadalajara',         abbreviation: 'GDL', league: 'liga-mx' as const },
  { id: 'tigres',     name: 'Tigres',              abbreviation: 'TIG', league: 'liga-mx' as const },
  { id: 'monterrey',  name: 'Monterrey',           abbreviation: 'MTY', league: 'liga-mx' as const },
  { id: 'pumas',      name: 'Pumas UNAM',          abbreviation: 'PUM', league: 'liga-mx' as const },
  { id: 'santos',     name: 'Santos Laguna',       abbreviation: 'SAN', league: 'liga-mx' as const },
  { id: 'atlas',      name: 'Atlas',               abbreviation: 'ATL', league: 'liga-mx' as const },
  { id: 'pachuca',    name: 'Pachuca',             abbreviation: 'PAC', league: 'liga-mx' as const },
  { id: 'tijuana',    name: 'Xolos Tijuana',       abbreviation: 'TIJ', league: 'liga-mx' as const },
  { id: 'queretaro',  name: 'Querétaro',           abbreviation: 'QRO', league: 'liga-mx' as const },
  { id: 'leon',       name: 'León',                abbreviation: 'LEO', league: 'liga-mx' as const },
  { id: 'toluca',     name: 'Toluca',              abbreviation: 'TOL', league: 'liga-mx' as const },
  { id: 'necaxa',     name: 'Necaxa',              abbreviation: 'NEC', league: 'liga-mx' as const },
  { id: 'juarez',     name: 'FC Juárez',           abbreviation: 'JUA', league: 'liga-mx' as const },
  { id: 'mazatlan',   name: 'Mazatlán FC',         abbreviation: 'MAZ', league: 'liga-mx' as const },
  { id: 'slp',        name: 'San Luis',            abbreviation: 'SLP', league: 'liga-mx' as const },
  { id: 'atletico',   name: 'Atlético de San Luis', abbreviation: 'LDU', league: 'liga-mx' as const },
];

const WC_TEAMS = [
  { id: 'MEX', name: 'Mexico',   abbreviation: 'MEX', league: 'mundial' as const },
  { id: 'ARG', name: 'Argentina',abbreviation: 'ARG', league: 'mundial' as const },
  { id: 'BRA', name: 'Brazil',   abbreviation: 'BRA', league: 'mundial' as const },
  { id: 'ESP', name: 'Spain',    abbreviation: 'ESP', league: 'mundial' as const },
  { id: 'FRA', name: 'France',   abbreviation: 'FRA', league: 'mundial' as const },
  { id: 'GER', name: 'Germany',  abbreviation: 'GER', league: 'mundial' as const },
  { id: 'ENG', name: 'England',  abbreviation: 'ENG', league: 'mundial' as const },
  { id: 'POR', name: 'Portugal', abbreviation: 'POR', league: 'mundial' as const },
  { id: 'USA', name: 'USA',      abbreviation: 'USA', league: 'mundial' as const },
  { id: 'CAN', name: 'Canada',   abbreviation: 'CAN', league: 'mundial' as const },
  { id: 'COL', name: 'Colombia', abbreviation: 'COL', league: 'mundial' as const },
  { id: 'URU', name: 'Uruguay',  abbreviation: 'URU', league: 'mundial' as const },
];

const FLAG: Record<string, string> = {
  MEX: '🇲🇽', ARG: '🇦🇷', BRA: '🇧🇷', ESP: '🇪🇸', FRA: '🇫🇷', GER: '🇩🇪',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', POR: '🇵🇹', USA: '🇺🇸', CAN: '🇨🇦', COL: '🇨🇴', URU: '🇺🇾',
};
const flag = (a: string) => FLAG[a] ?? '⚽';

export default function MiEquipoPage() {
  const { favorites, addFavorite, removeFavorite, isFavorite } = useTeam();
  const [tab, setTab] = useState<'liga-mx' | 'mundial'>('liga-mx');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <SiteNav />
      <div className="min-h-screen bg-[#f0f6f6] dark:bg-bg-1 font-display text-gray-900 dark:text-white">

        {/* Header */}
        <div className="bg-gray-900 dark:bg-[#080d12] px-4 py-8">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-2xl font-bold text-white">Mi Equipo</h1>
            <p className="mt-1 text-sm text-white/40">Sigue tus equipos favoritos de Liga MX y el Mundial</p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-6 pb-16 sm:px-6 space-y-8">

          {/* Favorites */}
          {mounted && favorites.length > 0 && (
            <section>
              <h2 className="text-sm font-bold tracking-wider uppercase text-gray-500 dark:text-white/50 mb-4">Mis favoritos</h2>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                {favorites.map((team) => (
                  <div key={team.id} className="relative rounded-2xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-4 text-center">
                    <button
                      onClick={() => removeFavorite(team.id)}
                      className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 text-[10px] hover:bg-red-100 hover:text-red-500 transition"
                      aria-label="Quitar"
                    >✕</button>
                    <span className="block text-3xl mb-1.5">{team.league === 'mundial' ? flag(team.abbreviation) : '⚽'}</span>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{teamNameEs(team.name)}</p>
                    <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">{team.league === 'liga-mx' ? 'Liga MX' : 'Mundial 2026'}</p>
                    <Link
                      href={team.league === 'liga-mx' ? '/liga-mx' : '/seleccion'}
                      className="mt-2 block text-[10px] font-bold text-brand-orange hover:underline"
                    >
                      Ver partidos →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Team browser */}
          <section>
            <h2 className="text-sm font-bold tracking-wider uppercase text-gray-500 dark:text-white/50 mb-4">Agregar equipo</h2>
            <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-white/[0.05] p-1 w-fit mb-5">
              {(['liga-mx', 'mundial'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={['rounded-lg px-4 py-1.5 text-xs font-bold tracking-wide transition-all',
                    tab === t ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70'].join(' ')}>
                  {t === 'liga-mx' ? 'Liga MX' : 'Mundial 2026'}
                </button>
              ))}
            </div>

            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {(tab === 'liga-mx' ? LIGAMX_TEAMS : WC_TEAMS).map((team) => {
                const fav = mounted && isFavorite(team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() => fav ? removeFavorite(team.id) : addFavorite(team)}
                    className={['rounded-xl border px-3 py-3 text-left transition group',
                      fav ? 'border-brand-orange/40 bg-brand-orange/5' : 'border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:border-brand-orange/30 hover:bg-brand-orange/5'].join(' ')}
                  >
                    <span className="block text-2xl mb-1.5">
                      {team.league === 'mundial' ? flag(team.abbreviation) : '⚽'}
                    </span>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{teamNameEs(team.name)}</p>
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
            <Link href="/tabla"    className="text-xs text-gray-400 dark:text-white/30 hover:text-brand-orange transition">Mundial 2026</Link>
            <Link href="/liga-mx"  className="text-xs text-gray-400 dark:text-white/30 hover:text-brand-orange transition">Liga MX</Link>
            <Link href="/seleccion" className="text-xs text-gray-400 dark:text-white/30 hover:text-brand-orange transition">Selección</Link>
          </div>
        </div>
      </div>
    </>
  );
}
