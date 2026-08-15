/**
 * Lightweight English → Spanish for Sportmonks commentary lines.
 * Pattern-based (not ML) so Completa reads Acceso-native without an extra API.
 */

function shortPlayer(name: string): string {
  const cleaned = name.replace(/\s*\([^)]+\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(' ');
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

/** Capture a player name that may include accents / hyphens. */
const PLAYER = '([A-Za-zÀ-ÿ\\.\\-\\s]+?)';

export function localizeComment(text: string): string {
  let t = text.trim();
  if (!t) return t;

  const rules: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
    [
      /^Kick-off!\s+The referee is\s+(.+)\.?$/i,
      (m) => `¡Saque inicial! Árbitro: ${m[1].replace(/\.$/, '')}.`,
    ],
    [/^Match ends with a score of\s+(.+)\.?$/i, (m) => `Final del partido · ${m[1].replace(/\.$/, '')}.`],
    [/^Match ends,?\s*(.+)$/i, (m) => `Final · ${m[1]}`],
    [/^Second Half (?:begins|starts)\.?(.*)$/i, (m) => `Arranca el segundo tiempo.${m[1] ? ` ${m[1]}` : ''}`],
    [/^First Half (?:begins|starts)\.?$/i, 'Arranca el primer tiempo.'],
    [/^Half[- ]Time\.?$/i, 'Descanso.'],
    [
      new RegExp(`^Goal!\\s+${PLAYER}\\s+scores,\\s+making it\\s+(.+)\\.?$`, 'i'),
      (m) => `¡Gol! ${shortPlayer(m[1])} pone el ${m[2].replace(/\.$/, '')}.`,
    ],
    [
      new RegExp(`^Goal!\\s+${PLAYER}\\s+scores(?:\\s+to make it\\s+(.+?))?(?:,\\s+assisted by\\s+${PLAYER})?\\.?>?$`, 'i'),
      (m) => {
        const score = m[2] ? ` · ${m[2]}` : '';
        const asst = m[3] ? ` Asistencia: ${shortPlayer(m[3])}.` : '';
        return `¡Gol! ${shortPlayer(m[1])}${score}.${asst}`;
      },
    ],
    [
      new RegExp(`^Shot from\\s+${PLAYER}\\s+with (?:his|her) (\\w+) foot results in a goal\\.?>?$`, 'i'),
      (m) => `Gol de ${shortPlayer(m[1])} (${m[2]}).`,
    ],
    [
      new RegExp(`^Yellow card (?:shown to|issued to)\\s+${PLAYER}\\.?$`, 'i'),
      (m) => `Amarilla para ${shortPlayer(m[1])}.`,
    ],
    [
      new RegExp(`^${PLAYER}\\s+receives a yellow card\\.?>?$`, 'i'),
      (m) => `Amarilla para ${shortPlayer(m[1])}.`,
    ],
    [
      new RegExp(`^Red card shown to\\s+${PLAYER}\\.?$`, 'i'),
      (m) => `¡Roja! Expulsado ${shortPlayer(m[1])}.`,
    ],
    [
      new RegExp(`^VAR decision results in a card change for\\s+${PLAYER}\\.?$`, 'i'),
      (m) => `VAR · Cambio de tarjeta para ${shortPlayer(m[1])}.`,
    ],
    [
      new RegExp(
        `^Substitution:\\s+${PLAYER}\\s+comes on for\\s+${PLAYER}\\.?$`,
        'i'
      ),
      (m) => `Cambio: entra ${shortPlayer(m[1])} por ${shortPlayer(m[2])}.`,
    ],
    [
      new RegExp(`^${PLAYER}\\s+is substituted for\\s+${PLAYER}\\.?$`, 'i'),
      (m) => `Cambio: entra ${shortPlayer(m[1])} por ${shortPlayer(m[2])}.`,
    ],
    [
      new RegExp(
        `^Attempt (?:missed|saved|blocked)\\.\\s+${PLAYER}\\s+(.+)$`,
        'i'
      ),
      (m) => {
        const rest = m[2];
        if (/saved/i.test(t)) return `Remate atajado · ${shortPlayer(m[1])}. ${rest}`;
        if (/blocked/i.test(t)) return `Remate bloqueado · ${shortPlayer(m[1])}. ${rest}`;
        return `Remate desviado · ${shortPlayer(m[1])}. ${rest}`;
      },
    ],
    [
      new RegExp(
        `^${PLAYER}\\s+takes a (?:right|left)-footed shot but misses\\.?>?$`,
        'i'
      ),
      (m) => `${shortPlayer(m[1])} remata y se va afuera.`,
    ],
    [
      new RegExp(
        `^${PLAYER}\\s+takes a (?:right|left)-footed shot,? but (?:it'?s|it is) saved\\.?>?$`,
        'i'
      ),
      (m) => `Ataja el remate de ${shortPlayer(m[1])}.`,
    ],
    [
      new RegExp(`^${PLAYER}'s header is saved\\.?>?$`, 'i'),
      (m) => `Cabezazo de ${shortPlayer(m[1])} atajado.`,
    ],
    [/^Offside\.?$/i, 'Fuera de lugar.'],
    [
      /^Offside,\s*(.+?)\.\s+(.+?) is caught offside\.?$/i,
      (m) => `Fuera de lugar · ${shortPlayer(m[2])} (${m[1]}).`,
    ],
    [/^Offside,\s*(.+)\.?$/i, (m) => {
      const who = m[1].replace(/\.$/, '').trim();
      return who && who !== '.' ? `Fuera de lugar · ${shortPlayer(who)}.` : 'Fuera de lugar.';
    }],
    [/^Corner(?: kick)?,?\s*awarded\.?$/i, 'Tiro de esquina.'],
    [/^Corner,\s*(.+)\.?$/i, (m) => {
      const who = m[1].replace(/\.$/, '').trim();
      if (!who || /^awarded$/i.test(who)) return 'Tiro de esquina.';
      return `Tiro de esquina · ${shortPlayer(who)}.`;
    }],
    [/^Corner(?: kick)?\.?$/i, 'Tiro de esquina.'],
    [
      new RegExp(
        `^${PLAYER}\\s+takes a (?:right|left)-footed shot,? but it is blocked\\.?>?$`,
        'i'
      ),
      (m) => `Remate bloqueado de ${shortPlayer(m[1])}.`,
    ],
    [
      new RegExp(
        `^${PLAYER}\\s+takes a shot with (?:his|her) (?:right|left) foot, but it is saved\\.?>?$`,
        'i'
      ),
      (m) => `Ataja el remate de ${shortPlayer(m[1])}.`,
    ],
    [
      new RegExp(
        `^${PLAYER}\\s+takes a shot with (?:his|her) (?:right|left) foot,? but misses\\.?>?$`,
        'i'
      ),
      (m) => `${shortPlayer(m[1])} remata y se va afuera.`,
    ],
    [
      new RegExp(
        `^Shot by\\s+${PLAYER}\\s+with (?:his|her) (?:right|left) foot, but it misses the target\\.?>?$`,
        'i'
      ),
      (m) => `${shortPlayer(m[1])} remata y se va afuera.`,
    ],
    [
      /^Gol de\s+(.+)\s+\(right\)\.?$/i,
      (m) => `Gol de ${shortPlayer(m[1])} (derecha).`,
    ],
    [
      /^Gol de\s+(.+)\s+\(left\)\.?$/i,
      (m) => `Gol de ${shortPlayer(m[1])} (izquierda).`,
    ],
    [
      /^Foul by\s+(.+?)\s+\(([^)]+)\)\.?$/i,
      (m) => `Falta de ${shortPlayer(m[1])}.`,
    ],
    [
      new RegExp(
        `^Foul by\\s+${PLAYER}\\.?$`,
        'i'
      ),
      (m) => `Falta de ${shortPlayer(m[1])}.`,
    ],
    [
      /^(.+?)\s+\(([^)]+)\)\s+wins a free kick in the attacking half\.?$/i,
      (m) => `${shortPlayer(m[1])} gana un tiro libre en ataque.`,
    ],
    [
      /^(.+?)\s+\(([^)]+)\)\s+wins a free kick in the defensive half\.?$/i,
      (m) => `${shortPlayer(m[1])} gana un tiro libre en defensa.`,
    ],
    [
      new RegExp(
        `^${PLAYER}\\s+wins a free kick(?: in the (.+))?\\.?>?$`,
        'i'
      ),
      (m) =>
        m[2]
          ? `${shortPlayer(m[1])} gana un tiro libre (${m[2]}).`
          : `${shortPlayer(m[1])} gana un tiro libre.`,
    ],
    [
      /^Fourth official has announced (\d+) minutes of added time\.?$/i,
      (m) => `El cuarto árbitro indica ${m[1]} minutos de compensación.`,
    ],
    [/^Lineups are announced and players are warming up\.?$/i, 'Alineaciones listas · calentamiento en cancha.'],
  ];

  for (const [re, out] of rules) {
    const m = t.match(re);
    if (!m) continue;
    return typeof out === 'function' ? out(m) : out;
  }

  // Soft replacements when no full-line match
  t = t
    .replace(/\bAttempt missed\b/gi, 'Remate desviado')
    .replace(/\bAttempt saved\b/gi, 'Remate atajado')
    .replace(/\bAttempt blocked\b/gi, 'Remate bloqueado')
    .replace(/\bright footed shot\b/gi, 'remate con derecha')
    .replace(/\bleft footed shot\b/gi, 'remate con izquierda')
    .replace(/\bfrom outside the box\b/gi, 'desde fuera del área')
    .replace(/\bfrom the centre of the box\b/gi, 'desde el área')
    .replace(/\bfrom the left side of the box\b/gi, 'desde la izquierda del área')
    .replace(/\bfrom the right side of the box\b/gi, 'desde la derecha del área')
    .replace(/\bis too high\b/gi, 'se va alto')
    .replace(/\bmisses to the left\b/gi, 'se va a la izquierda')
    .replace(/\bmisses to the right\b/gi, 'se va a la derecha')
    .replace(/\bis caught offside\b/gi, 'queda en fuera de lugar')
    .replace(/\bis shown the yellow card\b/gi, 've la amarilla')
    .replace(/\bis shown the red card\b/gi, 've la roja')
    .replace(/\bfor a bad foul\b/gi, 'por falta dura')
    .replace(/\bSubstitution,\s*/gi, 'Cambio · ')
    .replace(/\breplaces\b/gi, 'por')
    .replace(/\bAssisted by\b/gi, 'Asistencia de');

  return t;
}
