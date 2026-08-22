import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
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
    .slice(0, 5)
    .map(
      (s) =>
        `${s.label}: ${m.home.name} ${s.home}, ${m.away.name} ${s.away}`
    )
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

function scorersBlurb(m: MatchSnapshot): string {
  const scorers = m.scorers ?? [];
  if (!scorers.length) return '';
  return scorers
    .slice(0, 6)
    .map((s) => {
      const tag = s.pen ? ' de penal' : s.og ? ' en propia' : '';
      return `${s.name} al ${s.minute}${tag}`;
    })
    .join(', ');
}

/** Template pre-show when Anthropic is off: ~podcast cold open + matchup. */
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
      ? `Cuando arranque, Acceso Radio entra desde el capítulo.`
      : `En breve, silbato inicial. Acceso Radio te acompaña en la ficha. No te vayas.`;

  return [
    { id: 'preshow-1', text: open },
    { id: 'preshow-2', text: body },
    { id: 'preshow-3', text: close },
  ];
}

/** Template post-game recap podcast — spoken host, not a results ticker. */
export function templateRecap(match: MatchSnapshot, style: RadioStyle): ShowSegment[] {
  const score = scoreLine(match);
  const digest = commentaryDigest(match);
  const stats = statsBlurb(match);
  const scorers = scorersBlurb(match);
  const hasFeed = hasCommentary(match);
  const venue = [match.venue, match.city].filter(Boolean).join(', ');

  const open =
    style === 'caliente'
      ? `Oye, se acabó. Acceso Radio, recap del partido. Terminó ${score}${venue ? ` en ${venue}` : ''}. Quédate un minuto: te platico la noche como si estuviéramos saliendo del estadio.`
      : style === 'tactico'
        ? `Hola. Recap Acceso. Silbato final y el luminoso dice ${score}. Vamos a leer con calma qué inclinó el duelo, sin gritar, como un podcast corto postpartido.`
        : `Desde México y Estados Unidos, Acceso cierra la cabina. Terminó ${score}. Si lo viviste allá o aquí, el micrófono es el mismo: te cuento cómo se sintió.`;

  let mid: string;
  if (hasFeed) {
    const moments = digest.slice(0, 380) || 'los goles, las tarjetas y el pulso del público';
    mid =
      style === 'tactico'
        ? `Mira lo que inclinó el partido. ${moments}.${scorers ? ` En el luminoso anotaron ${scorers}.` : ''}${stats ? ` Y si miras los números: ${stats}.` : ''} Quédate con el marco, no solo con el grito del gol.`
        : `Lo que dejó huella, la neta: ${moments}.${scorers ? ` Los que marcaron: ${scorers}.` : ''}${stats ? ` Datos para la sobremesa: ${stats}.` : ''} Eso es lo que vas a discutir en el grupo del WhatsApp.`;
  } else if (stats || scorers) {
    mid = `No nos llegó una crónica completa a las noticias, y está bien: no inventamos. ${scorers ? `Lo claro del luminoso: ${scorers}.` : ''} ${stats ? `Los números que sí tenemos: ${stats}.` : ''} El resultado queda ${score}, y el debate arranca ahora.`;
  } else {
    mid = `Sin crónica detallada en las noticias esta noche. No relleno vacío: el marcador es ${score}, y la toma Acceso es que el partido ya es historia y conversación.`;
  }

  const close =
    style === 'puente'
      ? `Te dejo hasta aquí. Gracias por escucharnos de verdad. Estés en México o del otro lado del puente, mañana hay más Liga MX — y cuando juegue El Tri, aquí también. Nos escuchamos.`
      : `Eso fue el recap. Gracias por quedarte. Vuelve al pulso cuando quieras la siguiente noche, o métete a la cabina en el próximo partido. Hasta luego.`;

  // v2 ids bust in-memory recap beats so new podcast voice regenerates
  return [
    { id: 'recap-v2-1', text: open },
    { id: 'recap-v2-2', text: mid.trim() },
    { id: 'recap-v2-3', text: close },
  ];
}

async function rewriteShow(
  style: RadioStyle,
  kind: 'preshow' | 'recap',
  match: MatchSnapshot,
  draft: ShowSegment[]
): Promise<ShowSegment[]> {
  if (!anthropicEnabled()) return draft;

  try {
    const persona = PERSONAS[style];
    const voiceHint =
      style === 'caliente'
        ? 'Energía de amigo saliendo del estadio: cálido, opinado, sin gritar todo el tiempo.'
        : style === 'tactico'
          ? 'Host analítico postpartido: calmado, claro, como explicación en la mesa.'
          : 'Host binacional: cercano, puente MX–US, conversación en el coche.';

    const system =
      kind === 'recap'
        ? `${persona.system.replace(/Máximo 2 oraciones\./gi, 'Bloques hablados de podcast.')}

Eres el host de un PODCAST corto de Acceso Radio: "Recap" postpartido (~3 minutos). ${voiceHint}

REGLAS DE VOZ (crítico):
- Suena a persona hablando al micrófono, NO a boletín de resultados ni a ticker.
- Segunda persona (tú / oye / mira / fíjate). Español mexicano oral, contracciones, ritmo hablado.
- ${draft.length} bloques. Cada bloque: 4 a 7 oraciones para oídos. Fluye de uno al siguiente.
- Evita jerga de productora ("corte", "señal") y listas rígidas.
- Puedes usar un aparte corto ("la neta…", "ojo…") si ayuda.
- No inventes goles, asistencias, tarjetas ni declaraciones. Solo hechos del input.
- Reescribe el draft para que suene más humano; conserva el marcador y los hechos.
- Responde SOLO JSON: [{"id":"...","text":"..."}]`
        : `${persona.system.replace(/Máximo 2 oraciones\./gi, 'Bloques hablados de podcast.')} Escribes un pre-show corto de Acceso Radio (3 bloques). Cada bloque: 3 a 5 oraciones habladas en español mexicano, como podcast. Habla de tú. No inventes alineaciones ni goles. Responde SOLO JSON: [{"id":"...","text":"..."}]`;

    const raw = await anthropicChat({
      system,
      user: JSON.stringify({
        kind: kind === 'recap' ? 'match-recap-podcast' : 'match-preshow-podcast',
        goal:
          kind === 'recap'
            ? 'El oyente debe sentir que escucha un podcast postpartido, no un resumen de marcador.'
            : 'El oyente debe sentir una cabina abriendo el partido, no un aviso genérico.',
        home: match.home.name,
        away: match.away.name,
        score: scoreLine(match),
        scorers: match.scorers?.slice(0, 8) ?? [],
        venue: match.venue,
        city: match.city,
        state: match.state,
        stats: match.stats?.slice(0, 8) ?? [],
        commentary: commentaryDigest(match).slice(0, 900),
        draft,
      }),
      temperature: kind === 'recap' ? 0.8 : 0.75,
      maxTokens: kind === 'recap' ? 1200 : 900,
    });
    if (!raw) return draft;
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start < 0 || end < 0) return draft;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as ShowSegment[];
    if (!Array.isArray(parsed) || parsed.length < 2) return draft;
    return parsed
      .filter((s) => s && typeof s.text === 'string' && s.text.trim().length > 12)
      .map((s, i) => ({
        id: typeof s.id === 'string' ? s.id : `${kind}-v2-${i + 1}`,
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
