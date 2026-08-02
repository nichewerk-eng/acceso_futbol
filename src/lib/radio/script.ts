import type { MatchSnapshot } from '@/lib/sports';
import { PERSONAS, type RadioStyle } from './personas';

export type ScriptInput = {
  style: RadioStyle;
  kind: 'peak' | 'color' | 'bed' | 'kick' | 'recap';
  match: MatchSnapshot;
  eventText?: string;
  eventType?: string;
  minute?: number;
};

function scoreLine(m: MatchSnapshot) {
  const hs = m.home.score ?? '0';
  const as = m.away.score ?? '0';
  return `${m.home.name} ${hs}–${as} ${m.away.name}`;
}

/** Deterministic radio copy — always available without OpenAI. */
export function templateScript(input: ScriptInput): string {
  const { style, kind, match, eventText, eventType, minute } = input;
  const score = scoreLine(match);
  const min = minute !== undefined ? `${minute}'` : match.clock || '';

  if (kind === 'kick') {
    if (style === 'caliente')
      return `Arranca el duelo: ${match.home.name} contra ${match.away.name}. Acceso en la cabina — esto se pone bueno.`;
    if (style === 'tactico')
      return `Inicio en ${match.venue ?? 'el estadio'}: ${match.home.name} recibe a ${match.away.name}. A leer el primer tramo.`;
    return `${match.home.name} vs ${match.away.name}. Si lo ves desde México o desde Estados Unidos, Acceso te lo narra igual.`;
  }

  if (kind === 'bed') {
    if (style === 'caliente')
      return `Minuto ${min || 'en curso'}, el marcador sigue ${score}. La gente no suelta el partido.`;
    if (style === 'tactico')
      return `Vamos al ${min || 'minuto en curso'}. Marcador ${score}. Partido controlado, sin cambios en el luminoso.`;
    return `${score} en el reloj ${min || 'en vivo'}. Binacional pendiente del siguiente golpe.`;
  }

  if (kind === 'recap') {
    return `Final: ${score}. ${style === 'caliente' ? 'Qué noche.' : style === 'tactico' ? 'Partido cerrado en números.' : 'Así se vivió de lado a lado de la frontera.'}`;
  }

  const tip = eventText || eventType || 'Jugada clave';
  if (style === 'caliente')
    return `¡Atención! ${min ? `${min} — ` : ''}${tip}. Van ${score}.`;
  if (style === 'tactico')
    return `${min ? `${min}. ` : ''}${tip}. Marcador: ${score}.`;
  return `${min ? `${min}. ` : ''}${tip}. ${score} — y la afición MX–US conectada.`;
}

export async function generateScript(input: ScriptInput): Promise<string> {
  const fallback = templateScript(input);
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return fallback;

  try {
    const persona = PERSONAS[input.style];
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_RADIO_MODEL ?? 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 120,
        messages: [
          { role: 'system', content: persona.system },
          {
            role: 'user',
            content: JSON.stringify({
              kind: input.kind,
              score: scoreLine(input.match),
              home: input.match.home.name,
              away: input.match.away.name,
              venue: input.match.venue,
              city: input.match.city,
              eventType: input.eventType,
              eventText: input.eventText,
              minute: input.minute,
              draft: fallback,
            }),
          },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 8 ? text.replace(/^["']|["']$/g, '') : fallback;
  } catch {
    return fallback;
  }
}
