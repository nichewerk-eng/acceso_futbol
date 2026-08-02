export type MomentKind = 'take' | 'rumor' | 'lineup' | 'rivalry' | 'femenil' | 'bridge' | 'event';

export type Moment = {
  id: string;
  kind: MomentKind;
  headline: string;
  body: string;
  clubIds?: string[];
  href?: string;
  /** Optional TikTok / Shorts id when curated */
  videoId?: string;
  image?: string;
  tag?: string;
};

/** Seed editorial Moments — replace/extend without a CMS for Phase A/B. */
export const MOMENTS: Moment[] = [
  {
    id: 'apertura-pulso',
    kind: 'take',
    tag: 'Acceso',
    headline: 'El Apertura ya es el show principal.',
    body: 'Se acabó el Mundial como excusa. Tabla, rivalidad y narrativa: aquí es donde vive el fútbol mexicano ahora.',
    href: '/momento/apertura-pulso',
    image: '/luis.jpg',
  },
  {
    id: 'austin-bridge',
    kind: 'bridge',
    tag: 'MX ↔ US',
    headline: 'Liga MX en Austin no fue un accidente.',
    body: 'Q2 Stadium demostró que la afición binacional pide cobertura con urgencia, no subtítulos de relleno.',
    href: '/momento/austin-bridge',
    image: '/jonathang.jpg',
  },
  {
    id: 'femenil',
    kind: 'femenil',
    tag: 'Femenil',
    headline: 'La Femenil merece el mismo volumen.',
    body: 'Misma pasión, misma exigencia. Acceso cubre el juego completo, no solo los 18 de la tabla varonil.',
    href: '/momento/femenil',
  },
  {
    id: 'radio-teaser',
    kind: 'take',
    tag: 'Acceso Radio',
    headline: 'El partido en tu oído.',
    body: 'Elige tu narrador (Caliente, Táctico o Puente) y escucha Acceso con ~30s de retraso, como la radio de toda la vida.',
    href: '/momento/radio-teaser',
  },
  {
    id: 'clasico-heat',
    kind: 'rivalry',
    tag: 'Rivalidad',
    clubIds: ['america', 'chivas'],
    headline: 'Cuando se enfrentan América y Chivas, el país se detiene.',
    body: 'No es solo un partido: es agenda nacional. Nosotros lo tratamos como tal.',
    href: '/momento/clasico-heat',
  },
];
