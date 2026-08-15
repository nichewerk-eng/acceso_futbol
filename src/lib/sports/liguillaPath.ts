import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';

/** Apertura 2026: no Play-In — top 8 go straight to Liguilla. */
export const LIGUILLA_SPOTS = 8;
export const APERTURA_MATCHDAYS = 17;

export type LiguillaZone = 'in' | 'edge' | 'hunt' | 'out';

export type LiguillaClub = {
  position: number;
  pts: number;
  gp: number;
  abbreviation: string;
};

export type LiguillaPath = {
  zone: LiguillaZone;
  headline: string;
  detail: string;
  remaining: number;
};

export function liguillaPath(
  mine: LiguillaClub,
  table: LiguillaClub[]
): LiguillaPath | null {
  const ranked = [...table].filter((e) => e.position > 0).sort((a, b) => a.position - b.position);
  if (ranked.length < LIGUILLA_SPOTS + 1) return null;

  const cut = ranked[LIGUILLA_SPOTS - 1];
  const chase = ranked[LIGUILLA_SPOTS];
  if (!cut || !chase) return null;

  const remaining = Math.max(0, APERTURA_MATCHDAYS - mine.gp);
  const maxPts = remaining * 3;
  const gapToCut = cut.pts - mine.pts;
  const cushion = mine.pts - chase.pts;
  const cutAbbr = scheduleAbbr(cut.abbreviation);
  const chaseAbbr = scheduleAbbr(chase.abbreviation);
  const fechas = remaining === 1 ? '1 fecha' : `${remaining} fechas`;
  const sealed = remaining === 0;

  if (mine.position <= LIGUILLA_SPOTS) {
    if (sealed) {
      return {
        zone: 'in',
        headline: 'Clasificado',
        detail: 'El Apertura cerró adentro del corte. Top 8, sin Play-In.',
        remaining,
      };
    }
    if (cushion > maxPts) {
      return {
        zone: 'in',
        headline: 'Matemáticamente en Liguilla',
        detail: `${cushion} pts sobre ${chaseAbbr} (9º). El corte ya no alcanza.`,
        remaining,
      };
    }
    if (cushion > 0) {
      return {
        zone: 'in',
        headline: `En Liguilla · ${cushion} pts sobre ${chaseAbbr}`,
        detail: `9º a ${cushion} pts. Quedan ${fechas} · ${maxPts} pts en juego.`,
        remaining,
      };
    }
    return {
      zone: 'in',
      headline: `En Liguilla · empate en pts con ${chaseAbbr}`,
      detail: `Hoy el corte te favorece. Quedan ${fechas}.`,
      remaining,
    };
  }

  if (mine.position === LIGUILLA_SPOTS + 1) {
    if (sealed) {
      return {
        zone: 'out',
        headline: 'Fuera',
        detail: 'Cerró 9º. Sin Play-In en este Apertura.',
        remaining,
      };
    }
    if (gapToCut > maxPts) {
      return {
        zone: 'out',
        headline: 'Fuera en números',
        detail: `${gapToCut} pts del 8º (${cutAbbr}). Máximo ${maxPts} en juego.`,
        remaining,
      };
    }
    return {
      zone: 'edge',
      headline:
        gapToCut === 0
          ? `Orilla · empate en pts con ${cutAbbr}`
          : `Orilla · a ${gapToCut} pts de ${cutAbbr}`,
      detail: `8º tiene ${cut.pts} pts. Quedan ${fechas} · ${maxPts} pts en juego.`,
      remaining,
    };
  }

  if (sealed || gapToCut > maxPts) {
    return {
      zone: 'out',
      headline: sealed ? 'Sin Liguilla' : 'Fuera en números',
      detail: sealed
        ? `Cerró ${mine.position}º. El corte era ${cutAbbr}.`
        : `${gapToCut} pts del 8º (${cutAbbr}). Máximo ${maxPts} en juego.`,
      remaining,
    };
  }

  return {
    zone: 'hunt',
    headline: `A ${gapToCut} pts de Liguilla`,
    detail: `${cutAbbr} es 8º con ${cut.pts} pts. Quedan ${fechas} · ${maxPts} pts en juego.`,
    remaining,
  };
}

export function liguillaShareCopy(
  abbr: string,
  path: LiguillaPath
): { title: string; text: string } {
  return {
    title: `${scheduleAbbr(abbr)} · camino a Liguilla`,
    text: `${path.headline}\n${path.detail}`,
  };
}
