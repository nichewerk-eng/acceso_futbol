import type { EditorialWeather } from '@/lib/sports/types';

/** Rotating “why tonight matters” copy when the pulse is quiet. */
const ROTATION: EditorialWeather[] = [
  {
    tag: 'Apertura 2026',
    headline: 'La Liga MX no se pausa.',
    body: 'Mientras otros cierran la pestaña del Mundial, aquí sigue el clásico, la liguilla y la polémica. Acceso te mete al partido con contexto, no solo con el marcador.',
    ctaLabel: 'Ver Liga MX',
    ctaHref: '/liga-mx',
  },
  {
    tag: 'MX ↔ US',
    headline: 'El fútbol mexicano también se vive en Texas.',
    body: 'Houston, Austin, Dallas: la afición binacional no espera subtítulos. Horarios, dónde ver y la toma Acceso en un solo lugar.',
    ctaLabel: 'Entrar al pulso',
    ctaHref: '/#ahora',
  },
  {
    tag: 'El Tri',
    headline: 'La Selección siempre es titulares.',
    body: 'Convocatorias, rivales y el camino al siguiente ciclo. Cuando El Tri respira, Acceso narra.',
    ctaLabel: 'Elegir mi gravedad',
    ctaHref: '/#gravedad',
  },
  {
    tag: 'Femenil',
    headline: 'Liga MX Femenil también es Acceso.',
    body: 'Mismos estándares de urgencia y narrativa. El juego mexicano completo, no solo la tabla de los 18.',
    ctaLabel: 'Ver Femenil',
    ctaHref: '/liga-mx-femenil',
  },
];

export function editorialWeather(now = Date.now()): EditorialWeather {
  const idx = Math.floor(now / (6 * 3600_000)) % ROTATION.length;
  return ROTATION[idx];
}
