import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
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

/** Two-host Acceso dialogue. Google only summarizes this pack. */
export async function writeTwoHostScript(
  take: JornadaTake,
  fixtures: Fixture[],
  kind: TomaShowKind = 'dia'
): Promise<string | null> {
  if (!anthropicEnabled()) return null;
  const desk = jornadaTakeDeskTitle(take);
  const raw = await anthropicChat({
    system: `Eres editor de cabina Acceso Futbol. Escribes un PODCAST de dos voces a partir de UNA fuente. No inventas.

Voces:
- Alex: relator de cabina mexicana, popular, primera persona, color de mesa. Como un narrador de Liga MX en TV, no un podcast gringo. No imita a nadie por nombre. No grita.
- Mar: mexicana, de mesa, pone el número, empuja la pregunta. No suena a locutora limpia.

Formato EXACTO, una línea por turno:
Alex: ...
Mar: ...

Reglas:
- Español mexicano de México. Acentos SÍ. Léxico de cancha (la gente, el corte, se cae). Sin acento de España ni Argentina. Sin caricatura.
- Arranca Alex con el título de escritorio UNA vez: "${desk}".
${kindRules(kind)}
- Liga MX se escribe "Liga MX". La voz lo dirá bien aparte.
- PROHIBIDO relojes digitales y pares (PAC–PUE).
- PROHIBIDO marcadores que no estén en la fuente.
- Apertura 2026: Liguilla = top 8. No hay Play-In.
- Cierre: pregunta que divide (A/B). ~4 minutos. 12–18 turnos. Sin em-dash.`,
    user: pack(take, fixtures, kind),
    temperature: 0.45,
    maxTokens: 1400,
  });
  if (!raw) return null;
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/^\s+/, '').replace(/\s+/g, ' ').trim())
    .filter((l) => /^(Alex|Mar)\s*:/.test(l));
  if (lines.length < 6) return null;
  return lines.join('\n');
}
