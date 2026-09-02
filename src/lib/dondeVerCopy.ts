import { TV_CHANNELS, type TvChannelId } from '@/config/dondeVer';
import type { ClubIdentity } from '@/config/clubIdentity';
import type { JornadaOverview } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports/types';

export type FaqItem = { question: string; answer: string };

/** Kickoff label in Mexico City time (server-stable, es-MX). */
export function kickoffLabelMx(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Confirmed MX / US channel labels for a fixture, or null when unconfirmed. */
export function fixtureChannelLabels(f: Fixture): { mx: string | null; us: string | null } {
  const d = f.dondeVer;
  const ok = Boolean(d?.confirmed && (d.mxChannels?.length || d.usChannels?.length));
  if (!ok) return { mx: null, us: null };
  return {
    mx: d?.mxChannels?.length ? labelsFor(d.mxChannels) : null,
    us: d?.usChannels?.length ? labelsFor(d.usChannels) : null,
  };
}

function labelsFor(ids: TvChannelId[]): string {
  return ids
    .map((id) => TV_CHANNELS[id]?.label)
    .filter(Boolean)
    .join(', ');
}

function opponentOf(f: Fixture, clubAbbrMatches: (abbr: string) => boolean): string {
  return clubAbbrMatches(f.home.abbreviation) ? f.away.name : f.home.name;
}

function humanList(labels: string[]): string {
  const uniq = [...new Set(labels)].filter(Boolean);
  if (uniq.length === 0) return '';
  if (uniq.length === 1) return uniq[0];
  return `${uniq.slice(0, -1).join(', ')} y ${uniq[uniq.length - 1]}`;
}

/** FAQ for a single club's "dónde ver" page. Only includes answerable questions. */
export function teamDondeVerFaq(
  club: ClubIdentity,
  next: Fixture | null,
  matchesAbbr: (abbr: string) => boolean
): FaqItem[] {
  const items: FaqItem[] = [];
  if (next) {
    const opp = opponentOf(next, matchesAbbr);
    const when = kickoffLabelMx(next.date);
    const { mx, us } = fixtureChannelLabels(next);
    const where =
      mx || us
        ? `${mx ? `En México por ${mx}` : ''}${mx && us ? '. ' : ''}${
            us ? `En Estados Unidos por ${us}` : ''
          }.`
        : 'El canal se confirma cerca del partido.';
    items.push({
      question: `¿Dónde ver a ${club.name} hoy?`,
      answer: `El próximo partido de ${club.name} es contra ${opp} (${when}, hora del centro de México; en Acceso Futbol el reloj sigue la zona de tu dispositivo). ${where}`,
    });
    items.push({
      question: `¿A qué hora juega ${club.name}?`,
      answer: `${club.name} juega el ${when} hora del centro de México ante ${opp}. En la ficha el horario se muestra en tu zona.`,
    });
    if (us) {
      items.push({
        question: `¿En qué canal pasan a ${club.name} en Estados Unidos?`,
        answer: `En Estados Unidos, ${club.name} vs ${opp} se transmite por ${us}.`,
      });
    }
  } else {
    items.push({
      question: `¿Dónde ver a ${club.name}?`,
      answer: `${club.name} no tiene un partido próximo confirmado en la Liga MX. Consulta la guía de la jornada en curso para canales de México y Estados Unidos.`,
    });
  }
  return items;
}

/** FAQ for the full jornada guide, enriched with the channels actually in use. */
export function jornadaDondeVerFaq(overview: JornadaOverview | null): FaqItem[] {
  const fixtures = overview
    ? [...overview.live, ...overview.upcoming, ...overview.played]
    : [];
  const mxSet: string[] = [];
  const usSet: string[] = [];
  let freeToAir = false;
  for (const f of fixtures) {
    const d = f.dondeVer;
    if (!d?.confirmed) continue;
    for (const id of [...new Set(d.mxChannels ?? [])]) {
      const ch = TV_CHANNELS[id];
      if (ch) mxSet.push(ch.label);
      if (id === 'canal-5' || id === 'azteca-7' || id === 'nueve') freeToAir = true;
    }
    for (const id of [...new Set(d.usChannels ?? [])]) {
      const ch = TV_CHANNELS[id];
      if (ch) usSet.push(ch.label);
    }
  }

  const jornada = overview?.number ? `la Jornada ${overview.number} de la Liga MX` : 'la Liga MX';
  const items: FaqItem[] = [];

  items.push({
    question: `¿Dónde ver ${jornada}?`,
    answer:
      mxSet.length > 0
        ? `Los partidos se reparten entre ${humanList(mxSet)} en México. En esta guía tienes cada juego con su canal en México y Estados Unidos, con el horario en tu zona.`
        : `En esta guía tienes cada partido de la jornada con su canal en México y Estados Unidos, con el horario en tu zona.`,
  });

  if (usSet.length > 0) {
    items.push({
      question: '¿Qué canales transmiten la Liga MX en Estados Unidos?',
      answer: `En Estados Unidos, la jornada se ve por ${humanList(usSet)}, según el partido.`,
    });
  }

  if (freeToAir) {
    items.push({
      question: '¿Dónde ver la Liga MX gratis?',
      answer:
        'Canal 5 y Azteca 7 transmiten partidos selectos en TV abierta en México. ViX ofrece juegos con su plan gratuito según la jornada.',
    });
  }

  return items;
}
