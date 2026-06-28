// TikTok caption + hashtag generator — no external dependencies.
// Returns a ready-to-paste Spanish caption optimized for engagement.

import { teamNameEs } from '@/components/standings/teamNames';

export interface CaptionContext {
  type: 'group' | 'ligamx' | 'seleccion-result' | 'liguilla';
  groupLetter?: string;
  groupLeader?: string;
  teams?: string[];
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number;
  awayScore?: number;
  jornada?: string;
  season?: string;
}

const HOOK_POOL = [
  '¿Ya viste esto?',
  'Esto está pasando AHORA',
  'No te lo puedes perder 👀',
  'El fútbol no para',
  '¡Última hora!',
  'Esto lo cambia TODO',
];

const HASHTAGS_MUNDIAL = '#Mundial2026 #FIFAWorldCup2026 #ElTri #Selección #México #Fútbol';
const HASHTAGS_LIGAMX  = '#LigaMX #FútbolMexicano #Apertura2026 #México #Fútbol';
const HASHTAGS_GENERAL = '#AccesoFutbol #Fútbol #Mexico';

function randomHook() { return HOOK_POOL[Math.floor(Math.random() * HOOK_POOL.length)]; }

export function generateCaption(ctx: CaptionContext): string {
  const hook = randomHook();

  if (ctx.type === 'group' && ctx.groupLetter && ctx.groupLeader) {
    const leader = teamNameEs(ctx.groupLeader);
    return `${hook} 🔥\n\nGrupo ${ctx.groupLetter} del #Mundial2026 — ${leader} lidera el grupo con sus resultados más recientes.\n\n¿Pasarán como líderes? ¡Comenta tu pronóstico! 👇\n\n${HASHTAGS_MUNDIAL} ${HASHTAGS_GENERAL}`;
  }

  if (ctx.type === 'seleccion-result' && ctx.homeTeam && ctx.awayTeam) {
    const home = teamNameEs(ctx.homeTeam);
    const away = teamNameEs(ctx.awayTeam);
    const mexHome = ctx.homeTeam === 'Mexico' || ctx.homeTeam === 'México';
    const mexScore = mexHome ? ctx.homeScore : ctx.awayScore;
    const rivScore = mexHome ? ctx.awayScore : ctx.homeScore;
    const rival    = mexHome ? away : home;
    const result   = mexScore !== undefined && rivScore !== undefined
      ? mexScore > rivScore ? '¡VICTORIA de México! 🇲🇽🔥'
        : mexScore < rivScore ? 'México cayó ante ' + rival
        : 'Empate de México ante ' + rival
      : '';
    return `${hook}\n\n${result}\n\n🇲🇽 México ${mexScore ?? '?'} – ${rivScore ?? '?'} ${rival}\n\nAsí quedó la tabla después de este resultado. Deja tu reacción 👇\n\n${HASHTAGS_MUNDIAL} ${HASHTAGS_GENERAL}`;
  }

  if (ctx.type === 'ligamx' && ctx.jornada) {
    return `${hook} ⚽\n\n${ctx.jornada} de la ${ctx.season ?? 'Liga MX'} — acción en vivo, resultados y tabla de posiciones actualizada al instante.\n\nSigue todos los marcadores en @accesofutbolmx 🎯\n\n${HASHTAGS_LIGAMX} ${HASHTAGS_GENERAL}`;
  }

  if (ctx.type === 'liguilla') {
    return `${hook} 🏆\n\nAsí está la clasificación para la Liguilla del ${ctx.season ?? 'Apertura 2026'}.\n\n¿Tu equipo clasifica? Revisa la tabla completa en @accesofutbolmx 👇\n\n${HASHTAGS_LIGAMX} ${HASHTAGS_GENERAL}`;
  }

  // Default
  return `${hook}\n\nToda la acción del fútbol mexicano y el Mundial 2026 en tiempo real.\n\nSíguenos para no perderte nada 🎯\n\n${HASHTAGS_MUNDIAL} ${HASHTAGS_LIGAMX} ${HASHTAGS_GENERAL}`;
}

export function generateScript(ctx: CaptionContext): string {
  if (ctx.type === 'group' && ctx.groupLetter && ctx.groupLeader) {
    const leader = teamNameEs(ctx.groupLeader);
    return `HOOK (3 seg): "¿Sabes quién lidera el Grupo ${ctx.groupLetter} del Mundial?"

DESARROLLO (10-15 seg): 
"${leader} encabeza el Grupo ${ctx.groupLetter} con [X] puntos. Solo los dos primeros avanzan a Dieciseisavos. La tabla está así de apretada..."
[Mostrar tabla en pantalla]

CIERRE + CTA (5 seg):
"¿Creen que aguantan? Síguenos para los resultados en vivo. Link en bio."`;
  }

  if (ctx.type === 'seleccion-result') {
    const mexHome = ctx.homeTeam === 'Mexico' || ctx.homeTeam === 'México';
    const mexScore = mexHome ? ctx.homeScore : ctx.awayScore;
    const rivScore = mexHome ? ctx.awayScore : ctx.homeScore;
    const rival = teamNameEs(mexHome ? (ctx.awayTeam ?? '') : (ctx.homeTeam ?? ''));
    return `HOOK (3 seg): "México ${mexScore ?? '?'} – ${rivScore ?? '?'} ${rival}. Esto lo cambia todo."

DESARROLLO (10-15 seg):
"[Describe el partido brevemente]. Así quedó la tabla del grupo de México. [Lee los pts y posiciones]. La maldición del Quinto Partido podría romperse aquí en casa."

CIERRE + CTA (5 seg):
"¿Pasan México? Comenta tu pronóstico. Síguenos para más en @accesofutbolmx."`;
  }

  return `HOOK: "Esto está pasando ahora en el fútbol mexicano"
DESARROLLO: [Describe la situación actual con los datos de la pantalla]
CIERRE: "Síguenos en @accesofutbolmx para no perderte nada."`;
}
