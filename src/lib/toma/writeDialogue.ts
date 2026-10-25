import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
import { tomaOutro } from '@/lib/radio/signOff';
import {
  jornadaTakeColumnBody,
  type JornadaTake,
} from '@/lib/sports/jornadaTake';
import type { Fixture } from '@/lib/sports/types';
import type { TomaShowKind } from '@/lib/toma/episode';
import {
  allowedPointTotals,
  derbyName,
  fanName,
  type TomaNarrationFacts,
} from '@/lib/toma/narrationFacts';

export type TomaNarration = {
  headline: string;
  subhead: string;
  transcript: string;
};

export function sourceHash(take: JornadaTake, fixtures: Fixture[]): string {
  const scores = fixtures
    .map((f) => `${f.id}:${f.state}:${f.home.score ?? ''}-${f.away.score ?? ''}`)
    .sort()
    .join('|');
  const body = jornadaTakeColumnBody(take).join('\n');
  const raw = `${take.headline}\n${take.dek}\n${body}\n${scores}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(h, 31) + raw.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function scoreLine(f: Fixture): string {
  const home = fanName(f.home.abbreviation, f.home.name);
  const away = fanName(f.away.abbreviation, f.away.name);
  const derby = derbyName(f.home.abbreviation, f.away.abbreviation);
  const line = `${home} ${f.home.score ?? '0'}, ${away} ${f.away.score ?? '0'}${derby ? ` (${derby})` : ''}`;
  const scorers = (f.scorers ?? [])
    .map((s) => `${s.name}${s.minute ? ` ${s.minute}` : ''}`)
    .join(', ');
  return scorers ? `${line}. Goles: ${scorers}.` : `${line}.`;
}

function pack(
  take: JornadaTake,
  fixtures: Fixture[],
  kind: TomaShowKind,
  facts: TomaNarrationFacts
): string {
  const results =
    kind === 'antes'
      ? 'Sin marcadores. Es previa.'
      : fixtures.map(scoreLine).join('\n') || '(sin resultados)';
  return JSON.stringify(
    {
      show: kind,
      hechos: facts,
      resultados: results,
      columnaDelSitio: { titular: take.headline, grafs: jornadaTakeColumnBody(take) },
    },
    null,
    1
  );
}

function kindRules(kind: TomaShowKind, facts: TomaNarrationFacts): string {
  const picks = facts.picks.length;
  if (kind === 'antes') {
    return `- Show ANTES DEL SILBATAZO: previa. Cero marcadores, cero pronósticos como hecho.
- Orden: gancho, una frase de tabla, ${picks || 'los'} partidos de "qué ver" (uno por párrafo), tu toma en primera persona, la pregunta.`;
  }
  if (kind === 'cierre') {
    return `- Show CIERRE DE FECHA: crónica de toda la jornada con marcadores de "resultados".
- Orden: gancho con el resultado que más movió la tabla, cómo quedó el corte, dos o tres resultados con un dato cada uno, tu toma, la pregunta.`;
  }
  return `- Show CIERRE DEL DÍA: abre con lo que quedó sellado HOY (solo "resultados").
- Luego cómo mueve la tabla y ${picks ? `los ${picks} partidos de "qué ver" que faltan en la fecha` : 'lo que falta de la fecha'}, tu toma, la pregunta.`;
}

function system(kind: TomaShowKind, facts: TomaNarrationFacts): string {
  return `Eres la voz de Acceso Futbol. Grabas LA TOMA: una sola voz, apasionada y directa, para la afición de Liga MX en México y en Estados Unidos. Hablas como fan que sabe, no como locutor neutral. Frases cortas. Primera persona (yo creo, para mí, honestamente). Español mexicano. Ni España ni Argentina. No imitas a nadie.

FUENTE ÚNICA = "hechos" y "resultados". La columna del sitio es contexto de tono, no de datos.
- Cada número que digas (puntos, posiciones, jornadas, marcadores, fechas) sale tal cual de "hechos" o "resultados". Si no está ahí, no lo dices.
- Los campos "frase", "tabla", "forma", "siGana", "ultimoDuelo", "historial" y "cuando" ya vienen redactados y verificados. Puedes acortarlos o darles tu voz, pero sin cambiar números ni sentido. NO recalcules distancias, posiciones ni rachas.
- Escoge. No leas todos los datos: la gente escucha, no lee una tabla.
- Jornadas restantes: usa la frase exacta de hechos.jornadasRestantes.
- Liguilla = top 8. No hay Play-In.

GANCHO (primera frase):
- Un número y una consecuencia, armado con las "frase" de hechos.tabla. Forma: "Jornada 11 y ocho lugares de Liguilla en juego. [frase de líderes], pero [frase de UN club de burbuja]."
- Después, máximo UNA frase más de tabla. No recorras toda la burbuja.
- PROHIBIDO abrir con "Mira", "Bienvenidos", "Hola", "Qué tal" o una frase abstracta.

QUÉ VER (cada partido de hechos.picks, en orden, un párrafo cada uno):
- Nombre de afición del campo "partido". Si "clasico" trae nombre, dilo ("Clásico Tapatío"). Nunca "Guadalajara" si el hecho dice "Chivas".
- Di "cuando" tal cual, UNA vez por partido. Estadio si viene.
- MÁXIMO DOS datos por partido, los que más cuenten: tabla, ultimoDuelo (con su fecha), historial o forma.
- UNA consecuencia: el siGana que más mueve la tabla.
- Canales en una frase: "Lo ves por X en México y por Y en Estados Unidos." Solo si vienen en tv.

PROHIBIDO RELLENO. Di la idea UNA vez y pasa al dato:
- "metidos", "necesitan puntos", "necesitan ganar", "tan ajustado", "tan cerrado", "se define mucho más de lo que parece", "regalan un partidazo", "no juegan por jugar", "hay mucho en juego", "promete", "hace poco", "cada resultado", "define todo", "la burbuja aprieta".

TU TOMA (un párrafo):
- Una apuesta concreta en primera persona con el porqué en un dato que la sostenga (forma, historial, tabla): "Yo creo que Chivas sale del Jalisco con los tres puntos, porque..." Nada de generalidades sobre la jornada.
- "hoy" y "mañana" solo si "cuando" los dice.

${kindRules(kind, facts)}

CIERRE:
- Última frase tuya = la pregunta que divide sobre el partido estelar (el clásico si hay, si no el de más tabla), con las dos opciones y la orden de comentar. Forma: "¿Quién se lleva el Clásico Tapatío? Chivas o Atlas, comenta."
- NO escribas la despedida. El sistema agrega "${tomaOutro(kind)}"

FORMATO DE VOZ:
- Prosa hablada, 4 a 6 párrafos cortos separados por línea en blanco. Una sola voz. Sin etiquetas de locutor.
- Horas solo en palabras. Prohibido "7:30", "7 p.m.", "(PAC–PUE)".
- "Liga MX" con espacio. Sin em-dash. Sin emojis. 350 a 550 palabras.

TÍTULO Y SUBTÍTULO (para la página, no se leen):
- titulo: titular real de máx 8 palabras, con el partido o el dato fuerte. No la primera frase del guion.
- subtitulo: una línea de máx 18 palabras: qué cubre esta toma (jornada, día, partidos).

Responde SOLO JSON: {"titulo":"...","subtitulo":"...","guion":"párrafo\\n\\npárrafo"}`;
}

const FILLER =
  /\b(metidos|necesitan (?:los )?puntos|necesitan? ganar|tan ajustad[oa]|tan cerrad[oa]|regalan un partidazo|no juegan por jugar|se define mucho más de lo que parece|hay mucho en juego|cada resultado|define todo|doceavo|onceavo)\b|^\s*mira\b/im;

function parseJson(raw: string): { titulo?: unknown; subtitulo?: unknown; guion?: unknown } | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function cleanScript(raw: string): string {
  return raw
    .split(/\n{2,}/)
    .map((p) =>
      p
        .replace(/^\s*(Alex|Mar|Narrador|Voz|Host)\s*:\s*/i, '')
        .replace(/Esto fue La Toma de Acceso F[uú]tbol\.?[^\n]*$/i, '')
        .replace(/\s*[—–]\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)
    .join('\n\n');
}

function oneLine(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  const t = s.replace(/[*_#`"]/g, '').replace(/\s*[—–]\s*/g, '. ').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trim()}…`;
}

/** Point totals said as digits that are not in the facts pack. */
function unverifiedPoints(script: string, facts: TomaNarrationFacts): number[] {
  const allowed = allowedPointTotals(facts);
  const out: number[] = [];
  for (const m of script.matchAll(/\b(\d{1,2})\s*(?:puntos|pts|unidades)\b/gi)) {
    const n = Number(m[1]);
    if (!allowed.has(n)) out.push(n);
  }
  return out;
}

function problems(script: string, facts: TomaNarrationFacts): string[] {
  const out: string[] = [];
  const filler = script.match(FILLER);
  if (filler) out.push(`Quita el relleno "${filler[0].trim()}".`);
  const bad = unverifiedPoints(script, facts);
  if (bad.length) out.push(`Estos puntos no están en hechos: ${bad.join(', ')}. Usa solo números de hechos.`);
  return out;
}

/** Single-narrator Acceso monologue from verified facts. TTS reads the transcript verbatim. */
export async function writeTomaNarration(
  take: JornadaTake,
  fixtures: Fixture[],
  kind: TomaShowKind,
  facts: TomaNarrationFacts
): Promise<TomaNarration | null> {
  if (!anthropicEnabled()) return null;
  const sys = system(kind, facts);
  const user = pack(take, fixtures, kind, facts);
  let feedback = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await anthropicChat({
      system: sys,
      user: feedback ? `${user}\n\nCORRIGE: ${feedback}` : user,
      temperature: attempt === 0 ? 0.55 : 0.35,
      maxTokens: 1800,
      model: process.env.ANTHROPIC_TOMA_MODEL?.trim() || 'claude-sonnet-4-5',
    });
    const json = raw ? parseJson(raw) : null;
    const script = typeof json?.guion === 'string' ? cleanScript(json.guion) : '';
    if (script.length < 200) {
      feedback = 'Devuelve el JSON completo con "guion" de 400 a 600 palabras.';
      continue;
    }
    const issues = problems(script, facts);
    if (issues.length) {
      feedback = issues.join(' ');
      continue;
    }
    return {
      headline: oneLine(json?.titulo, 70) || `Jornada ${facts.jornada} Liga MX`,
      subhead: oneLine(json?.subtitulo, 140),
      transcript: `${script}\n\n${tomaOutro(kind)}`,
    };
  }
  return null;
}
