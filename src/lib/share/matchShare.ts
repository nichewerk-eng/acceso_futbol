import { leagueLabel } from '@/lib/seo';
import type { MatchSnapshot } from '@/lib/sports/types';

export function matchShareCopy(
  match: MatchSnapshot,
  league: string
): { title: string; text: string } {
  const label = leagueLabel(league);
  const jornada = match.jornada ? ` · ${match.jornada}` : '';
  const home = match.home.abbreviation;
  const away = match.away.abbreviation;
  const hs = match.home.score;
  const as = match.away.score;

  if (match.state === 'post' && hs != null && as != null) {
    return {
      title: `${home} ${hs}-${as} ${away} · ${label}`,
      text: `Final${jornada} · ${match.home.name} ${hs}–${as} ${match.away.name}`,
    };
  }

  if (match.state === 'in') {
    return {
      title: `${home} ${hs ?? 0}-${as ?? 0} ${away} EN VIVO`,
      text: `En vivo${jornada} · ${label} · Acceso Futbol`,
    };
  }

  return {
    title: `${match.home.name} vs ${match.away.name} · ${label}`,
    text: `Por jugar${jornada} · Dónde ver en Acceso Futbol`,
  };
}
