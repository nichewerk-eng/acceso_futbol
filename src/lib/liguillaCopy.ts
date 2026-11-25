import { fixtureChannelLabels, kickoffLabelMx, type FaqItem } from '@/lib/dondeVerCopy';
import { legLabel, type LiguillaBoard, type LiguillaRoundBoard } from '@/lib/sports/liguilla';
import type { Fixture } from '@/lib/sports/types';

export const LIGUILLA_RULES: { title: string; body: string }[] = [
  {
    title: 'Ocho clubes, sin Play-In',
    body: 'Los primeros 8 de la tabla general tras la Jornada 17 entran directo.',
  },
  {
    title: 'Cuartos: 1º vs 8º, 2º vs 7º, 3º vs 6º, 4º vs 5º',
    body: 'Ida en casa del peor ubicado; la vuelta la cierra el mejor sembrado.',
  },
  {
    title: 'Marcador global',
    body: 'Avanza quien anote más goles en los 180 minutos. No hay gol de visitante.',
  },
  {
    title: 'Empate en cuartos o semis',
    body: 'Pasa el club mejor ubicado en la tabla general. Sin tiempo extra ni penales.',
  },
  {
    title: 'Se reacomoda en cada ronda',
    body: 'Semifinales: el mejor sembrado que sigue vivo contra el peor (1 vs 4, 2 vs 3). La Final también la cierra el mejor ubicado.',
  },
  {
    title: 'Empate en la Final',
    body: 'Dos tiempos extra de 15 minutos y, si sigue igual, penales. La posición en la tabla ya no cuenta.',
  },
];

const ROUND_ARTICLE: Record<LiguillaRoundBoard['round'], string> = {
  cuartos: 'los cuartos de final',
  semis: 'las semifinales',
  final: 'la Final',
};

function matchup(f: Fixture) {
  return `${f.home.name} vs ${f.away.name}`;
}

function schedule(round: LiguillaRoundBoard): string {
  return round.fixtures
    .map((f) => `${legLabel(f.leg) ?? 'Partido'}: ${matchup(f)}, ${kickoffLabelMx(f.date)}`)
    .join('. ');
}

function channels(round: LiguillaRoundBoard): string {
  return round.fixtures
    .map((f) => {
      const { mx, us } = fixtureChannelLabels(f);
      if (!mx && !us) return null;
      return `${matchup(f)} (${legLabel(f.leg)?.toLowerCase() ?? ''}): ${[
        mx ? `${mx} en México` : '',
        us ? `${us} en Estados Unidos` : '',
      ]
        .filter(Boolean)
        .join('; ')}`;
    })
    .filter(Boolean)
    .join('. ');
}

/** FAQ for /liguilla, answered from the live board. */
export function liguillaFaq(board: LiguillaBoard): FaqItem[] {
  const items: FaqItem[] = [];
  const current = board.rounds.find((r) => r.round === board.current) ?? board.rounds[0]!;
  const known = current.fixtures.filter((f) => !f.home.placeholder && !f.away.placeholder);

  if (known.length) {
    items.push({
      question: `¿Cuándo se juegan ${ROUND_ARTICLE[current.round]} de la Liga MX Apertura 2026?`,
      answer: `${schedule({ ...current, fixtures: known })}. Horarios del centro de México.`,
    });
    const tv = channels({ ...current, fixtures: known });
    if (tv) {
      items.push({
        question: `¿Dónde ver ${ROUND_ARTICLE[current.round]} de la Liguilla?`,
        answer: `${tv}.`,
      });
    }
  }

  const seeds = board.seeds.map((s) => `${s.seed}. ${s.name} (${s.pts} pts)`).join(', ');
  items.push({
    question: '¿Qué equipos están en la Liguilla del Apertura 2026?',
    answer: `Los ocho clasificados por la tabla general: ${seeds}.`,
  });
  items.push({
    question: '¿Qué pasa si empatan en el marcador global?',
    answer:
      'En cuartos de final y semifinales avanza el club mejor ubicado en la tabla general; no hay tiempo extra ni penales. En la Final se juegan dos tiempos extra de 15 minutos y, si persiste el empate, penales.',
  });
  items.push({
    question: '¿Hay Play-In en el Apertura 2026?',
    answer: 'No. Los ocho primeros de la tabla general clasifican directo a cuartos de final.',
  });
  if (board.champion) {
    items.push({
      question: '¿Quién es el campeón del Apertura 2026?',
      answer: `${board.champion.name} ganó la Final del Apertura 2026.`,
    });
  }
  return items;
}
