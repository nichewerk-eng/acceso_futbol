import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';

/** Apertura 2026: no Play-In — top 8 go straight to Liguilla. */
export const LIGUILLA_SPOTS = 8;
export const APERTURA_MATCHDAYS = 17;

export type LiguillaZone = 'in' | 'edge' | 'hunt' | 'out';
export type LiguillaMarginSide = 'ahead' | 'behind' | 'tied';

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
  spots: number;
  maxPts: number;
  /** Pts ahead of 9th (in) or behind the cut (out/hunt). 0 if tied. */
  margin: number;
  marginSide: LiguillaMarginSide;
  vsAbbr: string;
  vsPosition: number;
  vsPts: number;
};

function fechasLabel(remaining: number) {
  return remaining === 1 ? '1 jornada' : `${remaining} jornadas`;
}

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
  const fechas = fechasLabel(remaining);
  const sealed = remaining === 0;

  const vsChase = {
    spots: LIGUILLA_SPOTS,
    remaining,
    maxPts,
    margin: Math.abs(cushion),
    marginSide: (cushion > 0 ? 'ahead' : 'tied') as LiguillaMarginSide,
    vsAbbr: chaseAbbr,
    vsPosition: LIGUILLA_SPOTS + 1,
    vsPts: chase.pts,
  };
  const vsCut = {
    spots: LIGUILLA_SPOTS,
    remaining,
    maxPts,
    margin: Math.abs(gapToCut),
    marginSide: (gapToCut > 0 ? 'behind' : 'tied') as LiguillaMarginSide,
    vsAbbr: cutAbbr,
    vsPosition: LIGUILLA_SPOTS,
    vsPts: cut.pts,
  };

  if (mine.position <= LIGUILLA_SPOTS) {
    if (sealed) {
      return {
        ...vsChase,
        zone: 'in',
        headline: 'Clasificado a Liguilla',
        detail: 'El Apertura cerró adentro del corte. Top 8 clasifican directo, sin Play-In.',
      };
    }
    if (cushion > maxPts) {
      return {
        ...vsChase,
        zone: 'in',
        headline: 'Ya no lo alcanzan',
        detail: `Matemáticamente en Liguilla: ${cushion} pts de ventaja sobre el 9º (${chaseAbbr}). El corte ya no llega.`,
      };
    }
    if (cushion > 0) {
      return {
        ...vsChase,
        zone: 'in',
        headline: 'Está en zona de Liguilla',
        detail: `${cushion} pts de ventaja sobre el 9º (${chaseAbbr}). Quedan ${fechas} · ${maxPts} pts en juego.`,
      };
    }
    return {
      ...vsChase,
      zone: 'in',
      headline: 'Está en zona de Liguilla',
      detail: `Empatado en puntos con el 9º (${chaseAbbr}); el corte lo favorece hoy. Quedan ${fechas}.`,
    };
  }

  if (mine.position === LIGUILLA_SPOTS + 1) {
    if (sealed) {
      return {
        ...vsCut,
        zone: 'out',
        headline: 'Fuera de Liguilla',
        detail: 'Cerró 9º. En este Apertura no hay Play-In: solo clasifican 8.',
      };
    }
    if (gapToCut > maxPts) {
      return {
        ...vsCut,
        zone: 'out',
        headline: 'Fuera en números',
        detail: `${gapToCut} pts debajo del 8º (${cutAbbr}). Máximo ${maxPts} pts en juego: ya no alcanza.`,
      };
    }
    return {
      ...vsCut,
      zone: 'edge',
      headline:
        gapToCut === 0
          ? `Orilla del corte · empate con ${cutAbbr}`
          : `Orilla del corte · a ${gapToCut} pts`,
      detail: `El 8º (${cutAbbr}) tiene ${cut.pts} pts. Quedan ${fechas} · ${maxPts} pts en juego.`,
    };
  }

  if (sealed || gapToCut > maxPts) {
    return {
      ...vsCut,
      zone: 'out',
      headline: sealed ? 'Sin Liguilla' : 'Fuera en números',
      detail: sealed
        ? `Cerró ${mine.position}º. El corte lo marcó ${cutAbbr}.`
        : `${gapToCut} pts debajo del 8º (${cutAbbr}). Máximo ${maxPts} pts en juego: ya no alcanza.`,
    };
  }

  return {
    ...vsCut,
    zone: 'hunt',
    headline: `A ${gapToCut} pts del corte`,
    detail: `El 8º es ${cutAbbr} con ${cut.pts} pts. Quedan ${fechas} · ${maxPts} pts en juego.`,
  };
}

export function liguillaMarginLine(path: LiguillaPath): string {
  const vs = `el ${path.vsPosition}º (${path.vsAbbr}, ${path.vsPts} pts)`;
  if (path.marginSide === 'ahead') {
    return `${path.margin} pts de ventaja sobre ${vs}`;
  }
  if (path.marginSide === 'behind') {
    return `${path.margin} pts debajo de ${vs}`;
  }
  return `Empatado a ${path.vsPts} pts con ${vs}`;
}

export function liguillaCalendarLine(path: LiguillaPath): string {
  if (path.remaining === 0) return 'El Apertura ya cerró.';
  return `Quedan ${fechasLabel(path.remaining)} · ${path.maxPts} pts todavía en juego`;
}

export function liguillaRuleLine(path: LiguillaPath): string {
  return `Clasifican los ${path.spots} primeros, directo. Sin Play-In.`;
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
