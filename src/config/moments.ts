export type MomentKind = 'take' | 'rumor' | 'lineup' | 'rivalry' | 'femenil' | 'bridge' | 'event';

export type Moment = {
  id: string;
  kind: MomentKind;
  headline: string;
  /** One-line deck for cards / Cable */
  body: string;
  /** Full editorial paragraphs for /momento/[id] */
  sections?: string[];
  /** Short Acceso take for Cable accesoLine */
  accesoLine?: string;
  publishedAt?: string;
  /** Pin in Lo que prende */
  cable?: boolean;
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
    id: 'america-santos-j3-banorte',
    kind: 'take',
    tag: 'Jornada 3',
    cable: true,
    publishedAt: '2026-08-02T23:00:00-06:00',
    clubIds: ['america'],
    image: '/stories/america_golea.png',
    headline: 'América golea 3-0… y el Banorte a medias',
    body: 'Las Águilas convencieron en la cancha. En las gradas, todavía no.',
    accesoLine: 'Convencieron en la cancha. La afición todavía no.',
    sections: [
      'El América goleó 3-0 al Santos y se trepó a lo más alto de la tabla. Pero mientras las Águilas volaban, medio Estadio Banorte estaba vacío. ¿Convencieron, o no convencieron?',
      'Vamos por partes. Minuto dos: Henry Martín. Catorce meses sin marcar en fase regular, y el capitán rompe la sequía, ovacionado por la misma afición que lo criticaba. Uno a cero.',
      'Con los mundialistas de regreso, otra jerarquía. El Rayito Brian Rodríguez entró a veinte del final y casi de inmediato el dos a cero. Y el Coco Cárdenas, veinte años, su primer gol en Liga MX para el tres a cero. Casi de trámite.',
      'Del otro lado, un Santos último, sin un solo punto y con Renato Paiva expulsado. Ya son siete años sin ganarle al América.',
      'Pero aquí está lo que me hace ruido. Domingo, cinco de la tarde, con promoción, y aun así el Banorte con huecos. Honestamente, un líder general no debería jugar a estadio medio lleno. Convencieron en la cancha. La afición todavía no.',
      'Ustedes qué dicen. A: este América ya es el mejor del torneo. B: golearon, pero contra un Santos regalado. C: el equipo no es el problema, la gente no llegó. Diganme abajo — y síguenos en TikTok @accesofutbolmx para el show completo.',
    ],
  },
  {
    id: 'america-refuerzos-cerrillo-perea',
    kind: 'rumor',
    tag: 'Fichajes',
    cable: true,
    publishedAt: '2026-08-02T18:00:00-06:00',
    clubIds: ['america'],
    image: '/stories/dwin_cerrilo.png',
    headline: 'Dos desconocidos en seis días: el América de la calculadora',
    body: 'Según reportes, Cerrillo y Perea llegan baratos. Las pérdidas de Ollamani explican el porqué.',
    accesoLine: 'Scouting con lupa… o América a la baja. Según reportes.',
    sections: [
      'Según reportes, el América acaba de fichar a un texano que casi nadie en México conoce. Y sería el segundo desconocido que traen en solo seis días.',
      'Se llama Edwin Cerrillo. Nacido en Waco, Texas, 25 años, con papás de Zacatecas —pasaporte mexicano—. Volante de contención y campeón de la MLS Cup con el LA Galaxy. Esta temporada lleva 15 partidos y cero goles: puro músculo en el medio. Y como tiene pasaporte mexicano, no ocuparía plaza de extranjero. Los mismos reportes lo dan por menos de un millón de dólares, con posible debut el jueves en Leagues Cup.',
      'Pero espera: el primer refuerzo habría llegado hace apenas seis días. Óscar Perea, extremo colombiano de 20 años, que venía del Estrasburgo de Francia y del AVS de Portugal. The Guardian ya lo había elegido entre los mejores juveniles del mundo. También a préstamo con opción de compra —y sí usa plaza de No Formado en México.',
      'Aquí está la historia real. Grupo Ollamani reportó pérdidas por más de 548 millones de pesos por el Mundial y la remodelación del estadio. América no vendió a nadie este verano. Así que el más grande estaría comprando barato: juventud y proyección, no nombres.',
      'Entonces la pregunta. ¿Es scouting inteligente, armado con lupa, o es un América venido a menos? Layún y compañía estarían fichando con la calculadora en la mano.',
      'Dime en los comentarios. A: scouting inteligente. B: América a la baja. C: mejor los espero en la cancha. Los leo a todos — y el show completo en TikTok @accesofutbolmx.',
    ],
  },
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
    id: 'clasico-heat',
    kind: 'rivalry',
    tag: 'Rivalidad',
    clubIds: ['america', 'chivas'],
    headline: 'Cuando se enfrentan América y Chivas, el país se detiene.',
    body: 'No es solo un partido: es agenda nacional. Nosotros lo tratamos como tal.',
    href: '/momento/clasico-heat',
  },
];

/** Moments flagged for Lo que prende (Acceso Cable). */
export function cableMoments(): Moment[] {
  return MOMENTS.filter((m) => m.cable).sort((a, b) => {
    const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
    const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
    return bt - at;
  });
}
