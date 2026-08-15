import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';
import type { JornadaOverview } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports/types';

export type JornadaTakePhase = 'preview' | 'live' | 'recap';

export type JornadaTakeBeat = {
  id: string;
  kicker: string;
  line: string;
  href: string;
  lock?: boolean;
};

export type JornadaTake = {
  phase: JornadaTakePhase;
  jornadaNum: number | null;
  kicker: string;
  phaseLabel: string;
  headline: string;
  dek: string;
  href: string | null;
  beats: JornadaTakeBeat[];
  /** 2–3 useful grafs: tabla, scorers, cable — not filler. */
  body?: string[];
  cites?: string[];
  source?: 'anthropic' | 'template';
};

export type TakeMine = (f: Fixture) => boolean;

const HOME_STAKE: Record<string, string> = {
  america: 'Las Águilas en casa. No es trámite.',
  chivas: 'El Rebaño abre el Akron.',
  'cruz-azul': 'La Máquina recibe. Sin anestesia.',
  tigres: 'Felinos en el Volcán.',
  monterrey: 'Rayados en casa. Frío en la mesa.',
  pumas: 'CU late. Los Pumas reciben.',
  toluca: 'Diablos en rojo. El Nemesio espera.',
  atlas: 'Rojinegro en el Jalisco.',
  santos: 'Laguna late. Los Guerreros reciben.',
  leon: 'La Fiera en casa. Lo impone.',
  pachuca: 'Tuzos en el Hidalgo.',
  tijuana: 'Xolos en la frontera.',
  necaxa: 'Rayos en Aguascalientes.',
  puebla: 'La Franja pide volumen en casa.',
  queretaro: 'Gallos: cada fecha como final.',
  'san-luis': 'Atlético recibe. Subir o sufrir.',
  juarez: 'Bravos en la línea.',
  atlante: 'Potros de vuelta. En casa.',
};

const AWAY_STAKE: Record<string, string> = {
  america: 'Las Águilas visitan. Que contesten.',
  chivas: 'El Rebaño sale. No se explica: se siente.',
  'cruz-azul': 'La Máquina de visita. Sigue.',
  tigres: 'Felinos al acecho, fuera de casa.',
  monterrey: 'Rayados de visita. Sin calor de tribuna.',
  pumas: 'Pumas en carretera. CU viaja.',
  toluca: 'Diablos de visita. Sin anestesia.',
  atlas: 'Atlas sale. Drama incluido.',
  santos: 'Santos visita. Laguna en la maleta.',
  leon: 'La Fiera no pide contexto. Lo impone afuera.',
  pachuca: 'Tuzos de visita. Cantera en carretera.',
  tijuana: 'Xolos cruzan. El puente es el producto.',
  necaxa: 'Rayos de visita. Cortos, eléctricos.',
  puebla: 'La Franja sale a pedir volumen.',
  queretaro: 'Gallos de visita. Pelean igual.',
  'san-luis': 'San Luis visita. Subir o sufrir.',
  juarez: 'Bravos de visita. MX ↔ US sin subtítulos.',
  atlante: 'Potros de visita. Hambre de memoria.',
};

function nums(f: Fixture): { h: number; a: number } {
  return { h: Number(f.home.score ?? 0), a: Number(f.away.score ?? 0) };
}

function scoreline(f: Fixture): string {
  const { h, a } = nums(f);
  return `${h}-${a}`;
}

function pair(f: Fixture): string {
  return `${f.home.abbreviation}–${f.away.abbreviation}`;
}

function hrefFor(f: Fixture): string {
  return `/partido/liga-mx/${f.id}`;
}

function clubId(abbr: string): string | null {
  return clubIdentityFromAbbr(abbr)?.id ?? null;
}

function nick(abbr: string): string {
  const club = clubIdentityFromAbbr(abbr);
  const raw = club?.nicknames[0];
  if (!raw) return club?.abbreviation ?? abbr;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function isClasico(f: Fixture): boolean {
  const sides = new Set([scheduleAbbr(f.home.abbreviation), scheduleAbbr(f.away.abbreviation)]);
  return sides.has('AME') && sides.has('GDL');
}

function kickWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      weekday: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function firstScorer(f: Fixture): string | null {
  const s = f.scorers?.[0];
  if (!s?.name) return null;
  return s.minute ? `${s.name} a los ${s.minute}'` : s.name;
}

function drama(f: Fixture): number {
  const { h, a } = nums(f);
  const margin = Math.abs(h - a);
  const total = h + a;
  let n = margin * 10 + total;
  if (margin >= 3) n += 24;
  if (total >= 4) n += 10;
  if (h === 0 && a === 0) n += 6;
  if (isClasico(f)) n += 28;
  return n;
}

function pickLead(games: Fixture[], mine: TakeMine | undefined): Fixture | null {
  if (games.length === 0) return null;
  const locked = mine ? games.filter(mine) : [];
  if (locked.length === 1) return locked[0];
  if (locked.length > 1) {
    return [...locked].sort((a, b) => drama(b) - drama(a))[0] ?? locked[0];
  }
  return [...games].sort((a, b) => drama(b) - drama(a))[0] ?? games[0];
}

function previewStake(f: Fixture, used: Set<string>): string {
  if (isClasico(f)) return 'Clásico nacional. El país se detiene.';
  const hid = clubId(f.home.abbreviation);
  const aid = clubId(f.away.abbreviation);
  const options = [
    hid && HOME_STAKE[hid] ? HOME_STAKE[hid] : `${f.home.abbreviation} recibe.`,
    aid && AWAY_STAKE[aid] ? AWAY_STAKE[aid] : `${f.away.abbreviation} visita.`,
    f.venue ? `Se juega en ${f.venue}.` : `${pair(f)}. Horario de jornada.`,
  ].filter((line) => !used.has(line));
  const line = options[0] ?? `${pair(f)}.`;
  used.add(line);
  return line;
}

function lockNick(f: Fixture, lockAbbr: string | null): string {
  if (!lockAbbr) return 'club';
  const a = scheduleAbbr(lockAbbr);
  const side =
    scheduleAbbr(f.home.abbreviation) === a ? f.home.abbreviation : f.away.abbreviation;
  return nick(side);
}

function recapLines(
  f: Fixture,
  lock: boolean,
  lockWon: boolean | null
): { headline: string; dek: string; kicker: string } {
  const { h, a } = nums(f);
  const line = scoreline(f);
  const home = f.home.abbreviation;
  const away = f.away.abbreviation;
  const margin = Math.abs(h - a);
  const winner = f.winnerSide;
  const scorer = firstScorer(f);
  const scorerBit = scorer ? ` ${scorer}.` : '';
  const clasico = isClasico(f);

  if (winner == null && h === 0 && a === 0) {
    return {
      kicker: '0-0',
      headline: clasico ? 'El Clásico no se atrevió' : `${home} y ${away}, en blanco`,
      dek: lock
        ? 'Cero a cero. Tu club no perdió. Tampoco pidió el partido.'
        : 'Nadie cruzó. La fecha tampoco se inmutó.',
    };
  }

  if (winner == null) {
    return {
      kicker: line,
      headline: clasico ? `Clásico partido ${line}` : `${home} y ${away} se lo parten`,
      dek: lock
        ? `${line}. No perdiste. Tampoco ganaste. Eso cuenta en la tabla, no en la memoria.`
        : `${line}. Puntos a medias. La discusión, completa.`,
    };
  }

  const win = winner === 'home' ? home : away;
  const lose = winner === 'home' ? away : home;

  if (lock && lockWon === false) {
    return {
      kicker: line,
      headline: margin >= 3 ? `Una goleada duele distinto` : `Duele ${line}`,
      dek: `${lose} cayó ante ${win}.${scorerBit} Sin consuelo de cable.`,
    };
  }

  if (margin >= 3) {
    return {
      kicker: line,
      headline: `${win} no pidió permiso`,
      dek: `${line} a ${lose}.${scorerBit} Contundencia, no trámite.`,
    };
  }

  if (margin === 1) {
    return {
      kicker: line,
      headline: scorer ? `${win}: ${scorer}` : `${win} por un gol`,
      dek: `${line} a ${lose}. Tres puntos. La fiesta, otro día.`,
    };
  }

  return {
    kicker: line,
    headline: `${win} se lleva a ${lose}`,
    dek: `${line}.${scorerBit}`,
  };
}

function lockWonMatch(f: Fixture, lockAbbr: string | null | undefined): boolean | null {
  if (!lockAbbr || f.winnerSide == null) return null;
  const a = scheduleAbbr(lockAbbr);
  const home = scheduleAbbr(f.home.abbreviation);
  const away = scheduleAbbr(f.away.abbreviation);
  if (home !== a && away !== a) return null;
  return f.winnerSide === 'home' ? home === a : away === a;
}

function recapBeat(f: Fixture, lock: boolean, lockAbbr: string | null | undefined): JornadaTakeBeat {
  const { h, a } = nums(f);
  const margin = Math.abs(h - a);
  const winner = f.winnerSide;
  const won = lockWonMatch(f, lockAbbr);
  const scorer = firstScorer(f);

  let line: string;
  if (f.state === 'in') {
    const clock = f.clock === 'HT' || /descanso/i.test(f.statusLabel || '') ? 'HT' : f.clock || 'LIVE';
    line = lock ? `${pair(f)} · tu club, ${clock}` : `${pair(f)} · ${clock} · ${scoreline(f)}`;
    return { id: f.id, kicker: scoreline(f), line, href: hrefFor(f), lock };
  }

  if (f.state === 'pre') {
    return {
      id: f.id,
      kicker: kickWhen(f.date),
      line: lock ? `Tu ${lockNick(f, lockAbbr ?? null)} todavía no sale` : previewStake(f, new Set()),
      href: hrefFor(f),
      lock,
    };
  }

  if (winner == null && h === 0 && a === 0) {
    line = `${pair(f)} en blanco`;
  } else if (winner == null) {
    line = `${pair(f)} se lo parten ${scoreline(f)}`;
  } else if (lock && won === false) {
    line = margin >= 3 ? `${pair(f)} · goleada en contra` : `${pair(f)} · se cayó ${scoreline(f)}`;
  } else if (margin >= 3) {
    const win = f.winnerSide === 'home' ? f.home.abbreviation : f.away.abbreviation;
    line = `${win} goleó ${scoreline(f)}`;
  } else if (scorer) {
    line = `${pair(f)} · ${scorer}`;
  } else {
    const win = f.winnerSide === 'home' ? f.home.abbreviation : f.away.abbreviation;
    line = `${win} ${scoreline(f)}`;
  }

  return {
    id: f.id,
    kicker: scoreline(f),
    line,
    href: hrefFor(f),
    lock,
  };
}

function phaseOf(j: JornadaOverview): JornadaTakePhase {
  if (j.live.length > 0) return 'live';
  if (j.played.length > 0) return 'recap';
  return 'preview';
}

function pickPreviewBeats(upcoming: Fixture[], marqueeId: string | undefined, isMine: TakeMine): Fixture[] {
  const rest = upcoming.filter((f) => f.id !== marqueeId);
  const lock = rest.filter(isMine);
  const clasico = rest.filter((f) => !isMine(f) && isClasico(f));
  const others = rest.filter((f) => !isMine(f) && !isClasico(f));
  const ordered = [...lock, ...clasico, ...others];
  const seen = new Set<string>();
  const out: Fixture[] = [];
  for (const f of ordered) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
    if (out.length >= 3) break;
  }
  return out;
}

export function buildJornadaTake(
  jornada: JornadaOverview,
  opts?: { isMine?: TakeMine; lockAbbr?: string | null }
): JornadaTake | null {
  const all = [...jornada.live, ...jornada.played, ...jornada.upcoming];
  if (all.length === 0) return null;

  const phase = phaseOf(jornada);
  const jornadaNum = jornada.number ?? null;
  const kicker = jornadaNum ? `Jornada ${jornadaNum}` : 'Liga MX';
  const isMine = opts?.isMine ?? (() => false);
  const lockAbbr = opts?.lockAbbr ?? null;

  if (phase === 'preview') {
    const n = jornada.upcoming.length;
    const marquee =
      jornada.upcoming.find(isMine) ??
      jornada.upcoming.find(isClasico) ??
      jornada.upcoming[0];
    const used = new Set<string>();
    const beats = pickPreviewBeats(jornada.upcoming, marquee?.id, isMine).map((f) => ({
      id: f.id,
      kicker: kickWhen(f.date),
      line: isMine(f)
        ? `Tu ${lockNick(f, lockAbbr)} · ${pair(f)}`
        : previewStake(f, used),
      href: hrefFor(f),
      lock: isMine(f),
    }));

    let headline: string;
    let dek: string;
    if (marquee && isMine(marquee)) {
      const when = kickWhen(marquee.date);
      headline = `Tu ${lockNick(marquee, lockAbbr)} sale ${when}`;
      dek = marquee.venue
        ? `${pair(marquee)} en ${marquee.venue}. El resto de la fecha espera.`
        : `${pair(marquee)}. ${n} duelos en la jornada. Uno es tuyo.`;
    } else if (marquee && isClasico(marquee)) {
      headline = 'El país se detiene esta fecha';
      dek = `${pair(marquee)} · ${kickWhen(marquee.date)}. El resto es ruido hasta que piten.`;
    } else if (marquee) {
      headline = previewStake(marquee, used);
      dek = `${n === 1 ? 'Un duelo' : `${n} duelos`}. Primero ${pair(marquee)}, ${kickWhen(marquee.date)}.`;
    } else {
      headline = 'La fecha está en el calendario';
      dek = 'Acceso espera el primer silbatazo.';
    }

    return {
      phase,
      jornadaNum,
      kicker,
      phaseLabel: 'Previa',
      headline,
      dek,
      href: marquee ? hrefFor(marquee) : null,
      beats,
    };
  }

  if (phase === 'live') {
    const lead = pickLead(jornada.live, isMine) ?? jornada.live[0];
    const { h, a } = nums(lead);
    const clock =
      lead.clock === 'HT' || /descanso/i.test(lead.statusLabel || '')
        ? 'Descanso'
        : lead.clock || 'LIVE';
    const others = [...jornada.live, ...jornada.played, ...jornada.upcoming]
      .filter((f) => f.id !== lead.id)
      .slice(0, 3);
    const lock = isMine(lead);
    return {
      phase,
      jornadaNum,
      kicker,
      phaseLabel: 'En vivo',
      headline: lock ? `Tu ${lockNick(lead, lockAbbr)} va ${h}-${a}` : `${pair(lead)} ${h}-${a}`,
      dek: lock
        ? `${clock}. No esperes el silbatazo para tener opinión.`
        : `${clock}. Se escribe en cancha, no en la tabla.`,
      href: hrefFor(lead),
      beats: others.map((f) => recapBeat(f, isMine(f), lockAbbr)),
    };
  }

  const lead = pickLead(jornada.played, isMine);
  if (!lead) return null;
  const lock = isMine(lead);
  const copy = recapLines(lead, lock, lockWonMatch(lead, lockAbbr));
  const leftover = jornada.upcoming.length;
  const dekExtra =
    leftover > 0
      ? leftover === 1
        ? ' Queda uno por patear.'
        : ` Quedan ${leftover} por patear.`
      : '';
  const others = [...jornada.played.filter((f) => f.id !== lead.id), ...jornada.upcoming].slice(0, 3);

  return {
    phase,
    jornadaNum,
    kicker,
    phaseLabel: 'Crónica',
    headline: copy.headline,
    dek: `${copy.dek}${dekExtra}`,
    href: hrefFor(lead),
    beats: others.map((f) => recapBeat(f, isMine(f), lockAbbr)),
  };
}

export function jornadaTakeShareCopy(take: JornadaTake): { title: string; text: string } {
  const title = take.jornadaNum ? `Toma · Jornada ${take.jornadaNum}` : 'Toma Acceso';
  const body = jornadaTakeColumnBody(take).join('\n\n');
  const beats = take.beats.map((b) => `· ${b.kicker} — ${b.line}`).join('\n');
  const text = [take.headline, take.dek, body, beats].filter(Boolean).join('\n\n');
  return { title, text };
}

/** Grafs for the column and the voice. Drops the slate rundown (times live in Dónde ver). */
export function jornadaTakeColumnBody(take: JornadaTake): string[] {
  const body = take.body ?? [];
  if (body.length === 0) return [];
  if (isSlateDump(body[0]!)) return body.slice(1);
  if (body.length >= 3) return body.slice(1);
  return body;
}

function isSlateDump(p: string): boolean {
  const contra = (p.match(/\bcontra\b/gi) ?? []).length;
  const clocks = (p.match(/\ba las\b/gi) ?? []).length;
  return (
    contra >= 4 ||
    clocks >= 4 ||
    /arranca con|el domingo sigue|el lunes cierra|nueve partidos en/i.test(p)
  );
}

/** On-screen desk line. One sentence: window + how many games. */
export function jornadaTakeDeskTitle(take: JornadaTake): string {
  const print = (s: string) => s.replace(/LigaMX/gi, 'Liga MX').trim();
  const dek = print(take.dek || '');
  const first = (dek.split(/(?<=[.!?])\s+/)[0] ?? dek).replace(/[.!?]+$/, '');
  if (first && first.length <= 80) return first;
  return print(take.headline);
}

function spokenScript(take: JornadaTake): string {
  return speakable(
    [jornadaTakeDeskTitle(take), jornadaTakeColumnBody(take).join(' ')].filter(Boolean).join('. ')
  );
}

export function jornadaTakeNarration(take: JornadaTake): string {
  return spokenScript(take);
}

export function jornadaTakeNarrationKey(take: JornadaTake): string {
  const text = jornadaTakeNarration(take);
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
  const n = take.jornadaNum ?? 'x';
  return `toma-${n}-${(h >>> 0).toString(36)}`;
}

export type TomaCorte = {
  id: string;
  n: number;
  label: string;
  cue: string;
  text: string;
  href?: string | null;
};

function speakable(s: string): string {
  return s
    .replace(/\s*[—–]\s*/g, '. ')
    .replace(/\(\s*[A-ZÁÉÍÓÚÜÑ]{2,4}\s*[–\-]\s*[A-ZÁÉÍÓÚÜÑ]{2,4}\s*\)/gi, '')
    .replace(/\b\d{1,2}:\d{2}\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)?/gi, '')
    .replace(/Liga\s*MX/gi, 'Liga eme equis')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashText(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** One playable cut: the column. Duelos live in Leer la toma, not as extra tracks. */
export function jornadaTakeCortes(take: JornadaTake): TomaCorte[] {
  const text = spokenScript(take);
  if (text.length < 12) return [];
  return [
    {
      id: `toma-${hashText(text)}`,
      n: 1,
      label: take.jornadaNum != null ? `Jornada ${take.jornadaNum}` : 'Toma',
      cue: take.headline,
      text,
    },
  ];
}

/** Overlay the server column onto the LOCK-aware local board. Live scores stay local. */
export function mergeJornadaTake(local: JornadaTake, remote: JornadaTake): JornadaTake {
  const byId = new Map(local.beats.map((b) => [b.id, b]));
  const liveSafe = local.phase === 'live';
  const beats =
    remote.beats.length > 0
      ? remote.beats.map((b) => {
          const loc = byId.get(b.id);
          return {
            ...b,
            href: loc?.href ?? b.href,
            lock: loc?.lock ?? b.lock,
            kicker: liveSafe ? loc?.kicker ?? b.kicker : b.kicker,
            line: liveSafe ? loc?.line ?? b.line : b.line,
          };
        })
      : local.beats;

  return {
    ...local,
    headline: liveSafe ? local.headline : remote.headline || local.headline,
    dek: liveSafe ? local.dek : remote.dek || local.dek,
    body: remote.body?.length ? remote.body : local.body,
    cites: remote.cites?.length ? remote.cites : local.cites,
    source: remote.source ?? local.source,
    beats,
  };
}
