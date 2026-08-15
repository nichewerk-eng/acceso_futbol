import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
import {
  jornadaTakeColumnBody,
  jornadaTakeDeskTitle,
  type JornadaTake,
} from '@/lib/sports/jornadaTake';
import type { Fixture } from '@/lib/sports/types';

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

function pack(take: JornadaTake, fixtures: Fixture[]): string {
  const results = fixtures
    .map((f) => {
      const line = `${f.home.name} ${f.home.score ?? '0'}-${f.away.score ?? '0'} ${f.away.name}`;
      const scorers = (f.scorers ?? [])
        .map((s) => `${s.name}${s.minute ? ` ${s.minute}` : ''}`)
        .join(', ');
      return scorers ? `${line}. Goles: ${scorers}.` : `${line}.`;
    })
    .join('\n');
  return [
    `Título de escritorio: ${jornadaTakeDeskTitle(take)}`,
    `Titular: ${take.headline}`,
    '',
    jornadaTakeColumnBody(take).join('\n\n'),
    '',
    'Resultados sellados de HOY (única fuente de marcadores):',
    results || '(sin resultados)',
  ].join('\n');
}

/** Two-host Acceso dialogue. Google only summarizes this pack. */
export async function writeTwoHostScript(
  take: JornadaTake,
  fixtures: Fixture[]
): Promise<string | null> {
  if (!anthropicEnabled()) return null;
  const desk = jornadaTakeDeskTitle(take);
  const raw = await anthropicChat({
    system: `Eres editor de cabina Acceso Futbol. Escribes un PODCAST de dos voces a partir de UNA fuente. No inventas.

Voces:
- Alex: más caliente, primera persona, rivalidad.
- Mar: corta, pone el número, empuja la pregunta.

Formato EXACTO, una línea por turno:
Alex: ...
Mar: ...

Reglas:
- Español mexicano. Acentos SÍ.
- Arranca Alex con el título de escritorio UNA vez: "${desk}".
- Luego el cuerpo (tabla / corte 8º / toma). NUNCA listes el slate partido por partido ni horarios.
- Liga MX se escribe "Liga MX". La voz lo dirá bien aparte.
- PROHIBIDO relojes digitales y pares (PAC–PUE).
- PROHIBIDO marcadores que no estén en la fuente.
- Apertura 2026: Liguilla = top 8. No hay Play-In.
- Cierre: pregunta que divide (A/B). ~4 minutos. 12–18 turnos. Sin em-dash.`,
    user: pack(take, fixtures),
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
