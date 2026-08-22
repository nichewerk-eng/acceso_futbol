import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
import { TOMA_OUTRO, withSpokenOutro } from '@/lib/radio/signOff';
import {
  jornadaTakeColumnBody,
  jornadaTakeDeskTitle,
  type JornadaTake,
} from '@/lib/sports/jornadaTake';
import type { Fixture } from '@/lib/sports/types';
import type { TomaShowKind } from '@/lib/toma/episode';

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
  const line = `${f.home.name} ${f.home.score ?? '0'}-${f.away.score ?? '0'} ${f.away.name}`;
  const scorers = (f.scorers ?? [])
    .map((s) => `${s.name}${s.minute ? ` ${s.minute}` : ''}`)
    .join(', ');
  return scorers ? `${line}. Goles: ${scorers}.` : `${line}.`;
}

function pack(take: JornadaTake, fixtures: Fixture[], kind: TomaShowKind): string {
  const results = fixtures.map(scoreLine).join('\n');
  const scoreBlock =
    kind === 'antes'
      ? 'Sin marcadores. Previa. No inventes resultados.'
      : kind === 'cierre'
        ? `Resultados sellados de la JORNADA (única fuente de marcadores):\n${results || '(sin resultados)'}`
        : `Resultados sellados de HOY (única fuente de marcadores):\n${results || '(sin resultados)'}`;
  return [
    `Título de escritorio: ${jornadaTakeDeskTitle(take)}`,
    `Titular: ${take.headline}`,
    `Show: ${kind}`,
    '',
    jornadaTakeColumnBody(take).join('\n\n'),
    '',
    scoreBlock,
  ].join('\n');
}

function kindRules(kind: TomaShowKind): string {
  if (kind === 'antes') {
    return `- Show ANTES DEL SILBATAZO: previa de la fecha. Energía de mesa, no pronósticos inventados.
- Cero marcadores. No anticipes goles ni ganadores como hecho.
- Cuerpo: tabla / corte 8º / qué se juega. NUNCA listes el slate partido por partido ni horarios.`;
  }
  if (kind === 'cierre') {
    return `- Show CIERRE DE FECHA: crónica de toda la jornada, no solo el último día.
- Usa SOLO marcadores de la fuente. Habla tabla, corte 8º y la toma. NUNCA listes el slate partido por partido.`;
  }
  return `- Show CIERRE DEL DÍA: lo que quedó sellado HOY.
- Luego el cuerpo (tabla / corte 8º / toma). NUNCA listes el slate partido por partido ni horarios.`;
}

/** Single-narrator Acceso monologue from one source. TTS reads this verbatim. */
export async function writeTomaNarration(
  take: JornadaTake,
  fixtures: Fixture[],
  kind: TomaShowKind = 'dia'
): Promise<string | null> {
  if (!anthropicEnabled()) return null;
  const desk = jornadaTakeDeskTitle(take);
  const raw = await anthropicChat({
    system: `Eres el narrador de cabina de Acceso Futbol. Grabas una TOMA hablada, UNA sola voz, a partir de UNA fuente. No inventas.

Voz:
- Relator de cabina mexicana, primera persona, color de mesa. Como un narrador de Liga MX en TV, no un podcast gringo. No imita a nadie por nombre. No grita. Ni España ni Argentina.
- Español mexicano de México. Léxico de cancha (la gente, el corte, se cae). Sin caricatura.

Formato:
- Prosa hablada corrida, 2 a 4 párrafos cortos. UNA sola voz. PROHIBIDO diálogo, turnos, etiquetas o nombres de locutor ("Alex:", "Mar:", "Narrador:").
- Abre UNA vez con el título de escritorio: "${desk}". Luego la toma.
${kindRules(kind)}
- Liga MX se escribe "Liga MX". La voz lo dirá bien aparte.
- PROHIBIDO relojes digitales y pares (PAC–PUE). Di "Pachuca contra Puebla", "lunes a las nueve".
- PROHIBIDO marcadores que no estén en la fuente.
- Apertura 2026: Liguilla = top 8. No hay Play-In.
- Cierra con la pregunta que divide (A/B). Última frase, SIEMPRE exactamente: "${TOMA_OUTRO}"
- ~3 a 4 minutos hablados. Sin em-dash.`,
    user: pack(take, fixtures, kind),
    temperature: 0.45,
    maxTokens: 1200,
  });
  if (!raw) return null;
  const text = raw
    .split('\n')
    .map((l) =>
      l
        .replace(/^\s*(Alex|Mar|Narrador|Voz|Host)\s*:\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)
    .join('\n');
  if (text.length < 120) return null;
  return withSpokenOutro(text, TOMA_OUTRO);
}
