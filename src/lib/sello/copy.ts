import { clubIdentityFromAbbr, getClubIdentity } from '@/config/clubIdentity';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';
import type { Fixture, FixtureScorer } from '@/lib/sports/types';
import type { SelloGravitySide, SelloKind } from './types';

export function nickFromAbbr(abbr: string): string {
  const club = clubIdentityFromAbbr(abbr);
  const raw = club?.nicknames[0];
  if (!raw) return club?.abbreviation ?? abbr;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function isClasicoNacional(f: Pick<Fixture, 'home' | 'away'>): boolean {
  const sides = new Set([scheduleAbbr(f.home.abbreviation), scheduleAbbr(f.away.abbreviation)]);
  return sides.has('AME') && sides.has('GDL');
}

function marcaLine(nick: string): string {
  return /s$/i.test(nick) ? `${nick} marcan` : `${nick} marca`;
}

function scorerBit(scorer: FixtureScorer | null | undefined): string {
  if (!scorer?.name) return '';
  const tag = scorer.pen ? ' de penal' : scorer.og ? ' en propia' : '';
  return scorer.minute ? `${scorer.name} a los ${scorer.minute}'${tag}.` : `${scorer.name}${tag}.`;
}

export function selloCopy(opts: {
  kind: SelloKind;
  fixture: Pick<Fixture, 'home' | 'away' | 'statusLabel' | 'clock' | 'jornada' | 'date'>;
  homeScore: number;
  awayScore: number;
  winnerSide: 'home' | 'away' | null;
  scorer: FixtureScorer | null;
  gravitySide: SelloGravitySide;
  gravityClubId: string | null;
}): { kicker: string; stamp: string; headline: string; line: string } {
  const { kind, fixture, homeScore, awayScore, winnerSide, scorer, gravitySide } = opts;
  const home = fixture.home.abbreviation;
  const away = fixture.away.abbreviation;
  const score = `${homeScore}-${awayScore}`;
  const clasico = isClasicoNacional(fixture);
  const lockAbbr =
    gravitySide === 'home' ? home : gravitySide === 'away' ? away : null;
  const lockNick = lockAbbr ? nickFromAbbr(lockAbbr) : null;
  const won =
    gravitySide && winnerSide ? gravitySide === winnerSide : null;
  const scorerLine = scorerBit(scorer);
  const margin = Math.abs(homeScore - awayScore);

  if (kind === 'pre') {
    return {
      kicker: 'AF://SELLO',
      stamp: 'VS',
      headline: clasico
        ? 'Clásico nacional. El país se detiene.'
        : lockNick
          ? `Hoy sale ${lockNick}.`
          : `${home} contra ${away}.`,
      line: lockNick
        ? 'Tu club. Horario y canal en Acceso.'
        : '¿Vas a verlo sin contexto?',
    };
  }

  if (kind === 'live' && homeScore === 0 && awayScore === 0) {
    const clock = fixture.clock === 'HT' || /descanso/i.test(fixture.statusLabel || '')
      ? 'HT'
      : fixture.clock || 'LIVE';
    return {
      kicker: 'AF://SELLO',
      stamp: clock,
      headline: clasico ? 'El Clásico sigue en blanco' : 'Sigue 0-0',
      line: lockNick
        ? `${lockNick} todavía no ${/s$/i.test(lockNick) ? 'piden' : 'pide'} el partido.`
        : 'La noche no se decide.',
    };
  }

  if (kind === 'gol') {
    const scoringAbbr = scorer?.side === 'away' ? away : home;
    const scoringNick = nickFromAbbr(scoringAbbr);
    const lockScored = gravitySide && scorer ? gravitySide === scorer.side : null;
    const stamp = fixture.clock && fixture.clock !== 'HT' ? fixture.clock : 'GOL';

    if (clasico) {
      return {
        kicker: score,
        stamp: 'GOL',
        headline: lockScored === false ? 'Duele en el Clásico' : 'El Clásico no perdona',
        line: scorerLine || `${scoringNick} pone el ${score}.`,
      };
    }

    if (lockScored === false) {
      return {
        kicker: score,
        stamp: 'GOL',
        headline: 'Duele',
        line: scorerLine || `El ${score} te deja frío.`,
      };
    }

    if (lockScored === true) {
      return {
        kicker: score,
        stamp: 'GOL',
        headline: marcaLine(lockNick ?? scoringNick),
        line: scorerLine || `El ${score}. Sin anestesia.`,
      };
    }

    return {
      kicker: score,
      stamp,
      headline: marcaLine(scoringNick),
      line: scorerLine || `${home} ${score} ${away}.`,
    };
  }

  if (kind === 'live') {
    const clock = fixture.clock === 'HT' || /descanso/i.test(fixture.statusLabel || '')
      ? 'HT'
      : fixture.clock || 'LIVE';
    const leadAbbr =
      homeScore > awayScore ? home : awayScore > homeScore ? away : null;
    return {
      kicker: score,
      stamp: clock,
      headline: leadAbbr
        ? `${nickFromAbbr(leadAbbr)} manda ${score}`
        : `${home} y ${away}, ${score}`,
      line: lockNick ? `Tu ${lockNick}, en vivo.` : 'En vivo. Acceso en la cabina.',
    };
  }

  // final
  if (winnerSide == null && homeScore === 0 && awayScore === 0) {
    return {
      kicker: '0-0',
      stamp: 'FT',
      headline: clasico ? 'El Clásico no se atrevió' : `${home} y ${away}, en blanco`,
      line: lockNick
        ? 'Cero a cero. Tu club no perdió. Tampoco pidió el partido.'
        : 'Nadie cruzó. La fecha tampoco se inmutó.',
    };
  }

  if (winnerSide == null) {
    return {
      kicker: score,
      stamp: 'FT',
      headline: clasico ? `Clásico partido ${score}` : `${home} y ${away} se lo parten`,
      line: lockNick
        ? `${score}. No perdiste. Tampoco ganaste.`
        : `${score}. Puntos a medias. La discusión, completa.`,
    };
  }

  const winAbbr = winnerSide === 'home' ? home : away;
  const loseAbbr = winnerSide === 'home' ? away : home;
  const winNick = nickFromAbbr(winAbbr);

  if (won === false) {
    return {
      kicker: score,
      stamp: 'FT',
      headline: margin >= 3 ? 'Una goleada duele distinto' : `Duele ${score}`,
      line: `${nickFromAbbr(loseAbbr)} cayó ante ${winNick}. ${scorerLine}`.trim(),
    };
  }

  if (margin >= 3) {
    return {
      kicker: score,
      stamp: 'FT',
      headline: `${winNick} no pidió permiso`,
      line: `${score} a ${loseAbbr}. ${scorerLine}`.trim(),
    };
  }

  if (margin === 1) {
    return {
      kicker: score,
      stamp: 'FT',
      headline: scorer ? `${winNick}: ${scorer.name}` : `${winNick} por un gol`,
      line: `${score} a ${loseAbbr}. Tres puntos.`,
    };
  }

  return {
    kicker: score,
    stamp: 'FT',
    headline: `${winNick} se lleva a ${loseAbbr}`,
    line: `${score}. ${scorerLine}`.trim(),
  };
}

export function selloPalette(gravityClubId: string | null) {
  const club = getClubIdentity(gravityClubId);
  return club?.palette ?? { ink: '#1e223d', signal: '#f54f1b', onInk: '#f6f5f2' };
}
