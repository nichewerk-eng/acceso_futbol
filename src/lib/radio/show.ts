import type { MatchSnapshot } from '@/lib/sports';
import { hasCommentary } from './phases';
import { PERSONAS, type RadioStyle } from './personas';

export type ShowSegment = {
  id: string;
  text: string;
};

function scoreLine(m: MatchSnapshot) {
  return `${m.home.name} ${m.home.score ?? '0'}-${m.away.score ?? '0'} ${m.away.name}`;
}

function statsBlurb(m: MatchSnapshot): string {
  if (!m.stats?.length) return '';
  return m.stats
    .slice(0, 6)
    .map((s) => `${s.label}: ${m.home.abbreviation} ${s.home}, ${m.away.abbreviation} ${s.away}`)
    .join('. ');
}

function commentaryDigest(m: MatchSnapshot): string {
  const lines = [
    ...m.comments.map((c) => (c.minute !== undefined ? `${c.minute}' ${c.text}` : c.text)),
    ...m.events.map((e) => `${e.clock || ''} ${e.text || e.type}`.trim()),
  ]
    .filter(Boolean)
    .slice(0, 18);
  return lines.join(' | ');
}

/** Template pre-show when OpenAI is off: ~podcast cold open + matchup. */
export function templatePreshow(match: MatchSnapshot, style: RadioStyle): ShowSegment[] {
  const venue = [match.venue, match.city].filter(Boolean).join(', ') || 'el estadio';
  const open =
    style === 'caliente'
      ? `Bienvenidos a Acceso Radio. En menos de quince minutos arranca ${match.home.name} contra ${match.away.name}. La cabina ya está caliente.`
      : style === 'tactico'
        ? `Pre-show Acceso. Lectura rápida: ${match.home.name} recibe a ${match.away.name} en ${venue}. Vamos al perfil del duelo.`
        : `Desde México y Estados Unidos, Acceso abre la cabina. ${match.home.name} vs ${match.away.name}. El puente ya está puesto.`;

  const body =
    style === 'tactico'
      ? `${match.home.name} buscará imponer ritmo en casa. ${match.away.name} llega a cortar circuitos y esperar el error. Primeros veinte minutos: intensidad y duelos en media cancha.`
      : style === 'caliente'
        ? `Dos escudos, una noche. Si ${match.home.name} prende al público temprano, esto se pone pesado. Si ${match.away.name} aguanta el embate, el partido se abre.`
        : `${match.home.name} y ${match.away.name} en el radar binacional. Horario compartido, emoción compartida. Quédate: el silbato está cerca.`;

  const close =
    style === 'puente'
      ? `Cuando arranque, Acceso Radio entra con ~30 segundos de retraso a propósito.`
      : `En breve, silbato inicial. Acceso Radio te acompaña con retraso de cabina. No te vayas.`;

  return [
    { id: 'preshow-1', text: open },
    { id: 'preshow-2', text: body },
    { id: 'preshow-3', text: close },
  ];
}

/** Template post-game recap podcast. */
export function templateRecap(match: MatchSnapshot, style: RadioStyle): ShowSegment[] {
  const score = scoreLine(match);
  const digest = commentaryDigest(match);
  const stats = statsBlurb(match);
  const hasFeed = hasCommentary(match);

  const open =
    style === 'caliente'
      ? `Final en Acceso. ${score}. Así se vivió la noche.`
      : style === 'tactico'
        ? `Recap táctico. Marcador final: ${score}. Repasamos lo que inclinó el partido.`
        : `Cierre Acceso, MX y US en la misma frecuencia. Terminó ${score}.`;

  const mid = hasFeed
    ? style === 'tactico'
      ? `Momentos clave: ${digest.slice(0, 420) || 'el luminoso y las transiciones definieron'}. ${stats ? `Números: ${stats}` : ''}`
      : `Lo que dejó huella: ${digest.slice(0, 420) || 'goles, tarjetas y el pulso del público'}. ${stats ? `Datos: ${stats}` : ''}`
    : stats
      ? `Sin crónica detallada en el cable, pero los números hablan. ${stats}`
      : `Sin crónica completa en el cable. El resultado queda: ${score}. La toma Acceso: el partido ya es historia y debate.`;

  const close =
    style === 'puente'
      ? `Gracias por quedarte en Acceso Radio. Mañana hay más Liga MX y, cuando juegue El Tri, aquí también.`
      : `Esto fue el recap Acceso. Vuelve al pulso para la siguiente noche.`;

  return [
    { id: 'recap-1', text: open },
    { id: 'recap-2', text: mid.trim() },
    { id: 'recap-3', text: close },
  ];
}

async function rewriteShow(
  style: RadioStyle,
  kind: 'preshow' | 'recap',
  match: MatchSnapshot,
  draft: ShowSegment[]
): Promise<ShowSegment[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return draft;

  try {
    const persona = PERSONAS[style];
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_RADIO_MODEL ?? 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content: `${persona.system} Escribes un podcast corto de radio (3 bloques). Cada bloque: 2 a 4 oraciones en español. No inventes goles ni tarjetas. Responde SOLO JSON: [{"id":"...","text":"..."}]`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              kind,
              home: match.home.name,
              away: match.away.name,
              score: scoreLine(match),
              venue: match.venue,
              state: match.state,
              stats: match.stats?.slice(0, 8) ?? [],
              commentary: commentaryDigest(match).slice(0, 900),
              draft,
            }),
          },
        ],
      }),
    });
    if (!res.ok) return draft;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start < 0 || end < 0) return draft;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as ShowSegment[];
    if (!Array.isArray(parsed) || parsed.length < 2) return draft;
    return parsed
      .filter((s) => s && typeof s.text === 'string' && s.text.trim().length > 12)
      .map((s, i) => ({
        id: typeof s.id === 'string' ? s.id : `${kind}-${i + 1}`,
        text: s.text.trim(),
      }));
  } catch {
    return draft;
  }
}

export async function buildPreshowSegments(
  match: MatchSnapshot,
  style: RadioStyle
): Promise<ShowSegment[]> {
  const draft = templatePreshow(match, style);
  return rewriteShow(style, 'preshow', match, draft);
}

export async function buildRecapSegments(
  match: MatchSnapshot,
  style: RadioStyle
): Promise<ShowSegment[]> {
  const draft = templateRecap(match, style);
  return rewriteShow(style, 'recap', match, draft);
}
