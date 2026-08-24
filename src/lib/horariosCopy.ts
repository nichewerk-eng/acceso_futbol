import { fixtureChannelLabels, kickoffLabelMx, type FaqItem } from '@/lib/dondeVerCopy';
import type { HorarioRound } from '@/lib/sports/horariosBoard';
import type { Fixture } from '@/lib/sports/types';

/**
 * Apertura 2026 board clock (same convention as the static calendar):
 * CDT / UTC-5 through 24 Oct, then CST. IANA `America/Mexico_City` is UTC-6
 * year-round after 2022, which would print summer kickoffs one hour early.
 */
export function horarioBoardTimeZone(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'Etc/GMT+6';
  return t < Date.parse('2026-10-25T06:00:00.000Z') ? 'Etc/GMT+5' : 'Etc/GMT+6';
}

export function horarioDateIn(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

export function horarioTimeIn(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

export function horarioDateMx(iso: string): string {
  return horarioDateIn(iso, horarioBoardTimeZone(iso));
}

export function horarioTimeMx(iso: string): string {
  return horarioTimeIn(iso, horarioBoardTimeZone(iso));
}

export function horarioKickoffMx(iso: string): string {
  const day = horarioDateMx(iso);
  const time = horarioTimeMx(iso);
  return day && time ? `${day} · ${time} h (CDMX)` : kickoffLabelMx(iso);
}

export function horarioDayKey(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });
  } catch {
    return iso.slice(0, 10);
  }
}

export function horarioDayLongIn(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return horarioDateIn(iso, tz);
  }
}

export function groupFixturesByDay(fixtures: Fixture[], tz: string) {
  const by = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const key = horarioDayKey(f.date, tz);
    const list = by.get(key) ?? [];
    list.push(f);
    by.set(key, list);
  }
  return [...by.entries()].map(([key, rows]) => ({
    key,
    label: horarioDayLongIn(rows[0].date, tz),
    fixtures: rows,
  }));
}

export function groupFixturesByBoardDay(fixtures: Fixture[]) {
  const by = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const tz = horarioBoardTimeZone(f.date);
    const key = horarioDayKey(f.date, tz);
    const list = by.get(key) ?? [];
    list.push(f);
    by.set(key, list);
  }
  return [...by.entries()].map(([key, rows]) => ({
    key,
    label: horarioDayLongIn(rows[0].date, horarioBoardTimeZone(rows[0].date)),
    fixtures: rows,
  }));
}

export function horarioStatus(f: Fixture): string {
  if (f.state === 'in') return 'En juego';
  if (f.state === 'post') return 'Final';
  return 'Por jugar';
}

export function horarioScore(f: Fixture): string | null {
  if (f.home.score == null || f.away.score == null) return null;
  if (f.state === 'pre') return null;
  return `${f.home.score}–${f.away.score}`;
}

function upcomingFrom(rounds: HorarioRound[]): Fixture[] {
  return rounds.flatMap((r) => r.fixtures).filter((f) => f.state === 'pre' || f.state === 'in');
}

function listUpcomingLine(f: Fixture): string {
  const when = horarioKickoffMx(f.date);
  return `${f.home.name} vs ${f.away.name} — ${when}`;
}

export function horariosFaq(rounds: HorarioRound[], currentLabel: string): FaqItem[] {
  const upcoming = upcomingFrom(rounds);
  const nextLines = upcoming.slice(0, 4).map(listUpcomingLine);
  const items: FaqItem[] = [
    {
      question: '¿Dónde ver los horarios de la Liga MX en Acceso Futbol?',
      answer:
        'En Acceso Futbol publicamos el calendario oficial de la Liga MX Apertura 2026 jornada por jornada, con hora del centro de México (CDMX) y canales de transmisión en México y Estados Unidos. La guía vive en accesofutbol.com/horarios.',
    },
    {
      question: `¿Cuáles son los horarios de ${currentLabel} de la Liga MX?`,
      answer:
        upcoming.length > 0
          ? `Los próximos partidos de ${currentLabel} y la fecha siguiente en Acceso Futbol: ${nextLines.join('; ')}.`
          : `Consulta el calendario completo de ${currentLabel} en Acceso Futbol, con hora CDMX en cada fila.`,
    },
    {
      question: '¿Los horarios de Liga MX están en hora de México?',
      answer:
        'En Acceso Futbol cada horario se muestra en la zona de tu dispositivo. Si estás en México, eso es hora del centro. Cada partido también enlaza a su ficha con el canal en México y en Estados Unidos.',
    },
    {
      question: '¿A qué hora abren los accesos de los estadios de Liga MX?',
      answer:
        'Las puertas de los estadios de Liga MX suelen abrir alrededor de dos horas antes del silbato. El horario en esta página es la hora de inicio del partido, no la apertura de accesos; confirma con tu club si hay un horario especial.',
    },
  ];

  const next = upcoming.find((f) => f.state === 'pre');
  if (next) {
    const { mx, us } = fixtureChannelLabels(next);
    const tv = [mx ? `México: ${mx}` : '', us ? `Estados Unidos: ${us}` : '']
      .filter(Boolean)
      .join('. ');
    items.push({
      question: `¿A qué hora juegan ${next.home.name} vs ${next.away.name}?`,
      answer: `${next.home.name} vs ${next.away.name} es el ${horarioKickoffMx(next.date)}.${tv ? ` ${tv}.` : ''}`,
    });
  }

  return items;
}
