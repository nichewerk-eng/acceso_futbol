import { clubRef } from '../clubAssets';
import { heuristicWordTimings } from '../timing';
import type { TomaVideoPlan } from '../types';
import { TOMA_VIDEO_FPS, TOMA_VIDEO_HEIGHT, TOMA_VIDEO_WIDTH } from '../types';

const EPISODE_ID = 'toma-ep-j8-2026-09-11';
const TRANSCRIPT = `Jornada 8 Liga MX: 9 partidos viernes a lunes La jornada ocho cierra con América imparable en la cima. Dieciséis puntos, cinco victorias en seis juegos, diferencia de gol de diez a favor. Ayer quedaron sellados tres resultados que movieron la tabla: Puebla le ganó uno a cero a Necaxa, Pachuca goleó tres a cero a Atlante y Querétaro sorprendió a Tijuana con un uno a cero. Lo que define esta jornada es que los clásicos llegan en un momento donde nadie puede darse el lujo de tropezar. Monterrey contra Tigres UANL hoy a las siete de la noche es un duelo donde ambos necesitan ganar para no quedarse atrás en la carrera. Toluca, tercero con trece puntos, recibe a Atlas hoy a las cinco de la tarde en lo que promete ser un encuentro cerrado. Guadalajara sigue segundo con catorce puntos y visita a Pumas UNAM el domingo a las siete de la noche en un partido donde los tapatíos buscarán mantener su ritmo ganador. La tabla se aprieta en la zona de Liguilla. Cruz Azul sostiene el octavo lugar con doce puntos, pero Pachuca acecha apenas un punto atrás. Con nueve partidos en puerta y la Liguilla ya definida como el top ocho en esta Apertura 2026, cada resultado cuenta doble. América tiene un colchón cómodo, pero la Liga MX no perdona. La pregunta que divide: ¿América ya se escapó con la Liguilla en la bolsa, o todavía hay tiempo para que alguien los alcance antes del cierre? Esto fue La Toma de Acceso Futbol.`;

const DURATION = 112;

/**
 * Hand-mapped Jornada 8 cut — first working example for the Remotion template.
 * Timestamps are proportional to the spoken script; real ElevenLabs alignment
 * replaces them when the episode is regenerated with with-timestamps.
 */
export function j8HandPlan(audioSrc?: string): TomaVideoPlan {
  const audioUrl = `/api/toma/audio/${encodeURIComponent(EPISODE_ID)}`;
  return {
    version: 1,
    episodeId: EPISODE_ID,
    jornadaNum: 8,
    dayKey: '2026-09-11',
    title: 'Viernes de primera sangre',
    format: '9:16',
    fps: TOMA_VIDEO_FPS,
    width: TOMA_VIDEO_WIDTH,
    height: TOMA_VIDEO_HEIGHT,
    durationSeconds: DURATION,
    audioUrl,
    audioSrc: audioSrc ?? audioUrl,
    transcript: TRANSCRIPT,
    words: heuristicWordTimings(TRANSCRIPT, DURATION),
    source: 'hand',
    generatedAt: new Date().toISOString(),
    scenes: [
      {
        type: 'intro',
        start: 0,
        end: 5.2,
        kicker: 'AF://TOMA',
        title: 'JORNADA 8',
        subtitle: '9 partidos · viernes a lunes',
      },
      {
        type: 'teamSpotlight',
        start: 5.2,
        end: 14.5,
        team: clubRef('america'),
        headline: 'Imparable en la cima',
        stats: [
          { label: 'PTS', value: '16' },
          { label: 'VICTORIAS', value: '5' },
          { label: 'DG', value: '+10' },
        ],
      },
      {
        type: 'results',
        start: 14.5,
        end: 26.5,
        headline: 'Resultados sellados',
        matches: [
          {
            home: clubRef('puebla'),
            away: clubRef('necaxa'),
            homeScore: 1,
            awayScore: 0,
          },
          {
            home: clubRef('pachuca'),
            away: clubRef('atlante'),
            homeScore: 3,
            awayScore: 0,
          },
          {
            home: clubRef('queretaro'),
            away: clubRef('tijuana'),
            homeScore: 1,
            awayScore: 0,
          },
        ],
      },
      {
        type: 'matchCard',
        start: 26.5,
        end: 38,
        home: clubRef('monterrey'),
        away: clubRef('tigres'),
        when: 'HOY · 7:00 PM',
        label: 'CLÁSICO REGIO',
      },
      {
        type: 'matchCard',
        start: 38,
        end: 48,
        home: clubRef('toluca'),
        away: clubRef('atlas'),
        when: 'HOY · 5:00 PM',
        label: 'ENCUENTRO CERRADO',
      },
      {
        type: 'matchCard',
        start: 48,
        end: 60,
        home: clubRef('pumas'),
        away: clubRef('chivas'),
        when: 'DOMINGO · 7:00 PM',
        label: 'CLÁSICO NACIONAL',
      },
      {
        type: 'standings',
        start: 60,
        end: 78,
        headline: 'La tabla se aprieta',
        rows: [
          { rank: 1, team: clubRef('america'), pts: 16, highlight: true },
          { rank: 2, team: clubRef('chivas'), pts: 14 },
          { rank: 3, team: clubRef('toluca'), pts: 13 },
          { rank: 8, team: clubRef('cruz-azul'), pts: 12, highlight: true },
          { rank: 9, team: clubRef('pachuca'), pts: 11, highlight: true },
        ],
      },
      {
        type: 'quote',
        start: 78,
        end: 100,
        text: '¿América ya se escapó con la Liguilla en la bolsa, o todavía hay tiempo para que alguien los alcance?',
        emphasis: ['América', 'Liguilla', 'alcance'],
      },
      {
        type: 'outro',
        start: 100,
        end: DURATION,
        line: 'Esto fue La Toma de Acceso Futbol.',
      },
    ],
  };
}

export const J8_EPISODE_ID = EPISODE_ID;
