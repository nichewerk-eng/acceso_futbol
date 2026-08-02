// Single source of truth for the /mediakit page. Update the numbers here
// each reporting cycle. Nothing else in the media kit needs to change.

export type PlatformStat = {
  id: "facebook" | "tiktok" | "youtube" | "instagram";
  name: string;
  handle: string;
  metricLabel: string;
  metricValue: number;
  approxMetric?: boolean;
  reachValue?: number;
  reachLabel?: string;
  followers: number;
  followersLabel: string;
  growth: number;
  growthLabel: string;
  secondaryMetric?: { label: string; value: string };
  badge?: string;
  positioning: string;
};

export type ProofPoint = {
  label: string;
  value: string;
  detail: string;
  tag?: string;
};

export type VerticalFit = {
  name: string;
  rationale: string;
};

export type RatePackage = {
  name: string;
  includes: string;
  reach: string;
};

export const mediaKit = {
  meta: {
    title: "Acceso Futbol · Media Kit",
    updated: "Julio 2026",
  },

  window: {
    label: "1 al 31 de julio de 2026",
    note: "Datos: TikTok orgánico, Instagram, página de Facebook y canal de YouTube. Mes calendario completo, sin excluir ni ajustar picos.",
  },

  headline: {
    combinedContentViews: 4184537,
    combinedContentViewsDisplay: "4.18M",
    combinedContentViewsLabel:
      "vistas de contenido en 4 plataformas: TikTok, Instagram, YouTube y video de Facebook",
    facebookReach: 2704251,
    facebookReachLabel: "alcance único adicional en Facebook",
    facebookOrganicNote: "100% orgánico, sin pauta pagada",
    totalAudience: 37396,
    totalAudienceLabel: "seguidores combinados en las 4 plataformas",
    netNewFollowers: 6195,
    netNewFollowersLabel: "seguidores netos nuevos en julio",
    facebookGrowthShare: 73,
    creatorRewards: "Miembro del programa TikTok Creator Rewards",
    engagementBadges: [
      { value: "3.35%", label: "Interacción en Instagram, la más alta" },
      { value: "2.89%", label: "Interacción en Facebook" },
      { value: "2.42%", label: "Interacción en TikTok" },
    ],
  },

  platforms: [
    {
      id: "facebook",
      name: "Facebook",
      handle: "Acceso Futbol",
      metricLabel: "Impresiones",
      metricValue: 5534066,
      reachValue: 2704251,
      reachLabel: "alcance real (personas únicas)",
      followers: 20542,
      followersLabel: "seguidores",
      growth: 4519,
      growthLabel: "nuevos en julio",
      secondaryMetric: { label: "Tasa de interacción", value: "2.89%" },
      positioning: "Máximo alcance binacional. Motor de distribución, no de comunidad profunda.",
    },
    {
      id: "tiktok",
      name: "TikTok",
      handle: "@accesofutbolmx",
      metricLabel: "Vistas",
      metricValue: 1958000,
      approxMetric: true,
      followers: 12514,
      followersLabel: "seguidores",
      growth: 679,
      growthLabel: "nuevos en julio",
      secondaryMetric: { label: "Tasa de interacción", value: "2.42%" },
      badge: "Creator Rewards",
      positioning: "Un video viral aportó ~1.02M de vistas; el resto del mes promedió ~31K por video, línea base sólida.",
    },
    {
      id: "youtube",
      name: "YouTube Shorts",
      handle: "Acceso Futbol",
      metricLabel: "Vistas",
      metricValue: 796600,
      followers: 2940,
      followersLabel: "suscriptores",
      growth: 654,
      growthLabel: "nuevos en julio, +29% mensual",
      secondaryMetric: { label: "Minutos vistos", value: "358,126" },
      positioning: "La mayor retención por espectador: ~5,969 horas vistas. Ideal para integraciones largas.",
    },
    {
      id: "instagram",
      name: "Instagram",
      handle: "@accesofutbolmx",
      metricLabel: "Vistas",
      metricValue: 230500,
      approxMetric: true,
      reachValue: 124620,
      reachLabel: "alcance",
      followers: 1400,
      followersLabel: "seguidores",
      growth: 343,
      growthLabel: "nuevos en julio (bruto)",
      secondaryMetric: { label: "Tasa de interacción", value: "3.35%" },
      positioning: "La más chica pero la más fiel: 390 guardados, la mejor tasa de interacción de las cuatro plataformas.",
    },
  ] satisfies PlatformStat[],

  demographics: {
    facebook: { men: 89, age35Plus: 73.5, mexico: 80.6 },
    tiktok: { men: 86, age35Plus: 50.1, unitedStates: 36 },
    instagram: { age25to54: 70, splitNote: "Dividido en partes iguales entre México y Estados Unidos" },
    summary: "Audiencia adulta de alto poder adquisitivo, no una audiencia adolescente.",
    verticals: [
      {
        name: "Apuestas deportivas",
        rationale: "Pronósticos diarios y previas en Facebook y YouTube. Formato editorial, sin narrar cuotas.",
      },
      {
        name: "Cerveza",
        rationale: "89% de audiencia masculina, edad ideal para patrocinios de consumo social y deportivo.",
      },
      {
        name: "Telecomunicaciones",
        rationale: "Audiencia binacional que sigue fútbol en vivo tanto en México como en Estados Unidos.",
      },
      {
        name: "Automotriz",
        rationale: "73.5% de la audiencia tiene 35 años o más, edad de mayor poder de compra vehicular.",
      },
      {
        name: "Servicios financieros",
        rationale: "Audiencia adulta de alto poder adquisitivo, no una base adolescente.",
      },
    ] satisfies VerticalFit[],
  },

  geography: {
    mexicoMetros: [
      "Ciudad de México",
      "Tijuana",
      "Toluca",
      "Guadalajara",
      "Monterrey",
    ],
    usMetros: ["Houston", "Austin", "Dallas", "Chicago", "Los Ángeles"],
    austin: {
      igShare: 7.7,
      texasShare: 10.1,
      texasCitiesInTop5: "3 de 5",
    },
    proofStat:
      "Nuestro video más visto del mes fue una activación de Leagues Cup en el Q2 Stadium de Austin: 87,358 vistas y 2,874 compartidos.",
    activationNote:
      "Activaciones en eventos de Texas y programación en el Q2 Stadium disponibles para patrocinio.",
  },

  content: {
    formats: [
      "Reacción post-partido, análisis táctico y narrativas de jugadores",
      "Previas de partidos con horarios y canales de transmisión en México y Estados Unidos",
      "Gráficos de brackets y calendarios: nuestro formato de mayor alcance",
      "Entrevistas con creadores y cobertura de eventos en vivo",
      "Fútbol femenil: cobertura de la Liga MX Femenil y momentos clave",
    ],
    cadence: "1 a 3 publicaciones diarias, con más volumen en días de partido",
    formatNote: "Todo en video vertical, distribuido en las cuatro plataformas.",
  },

  proof: [
    {
      label: "Video viral de julio",
      value: "~1.02M",
      detail: "vistas en un solo video de TikTok (5 de julio); el resto del mes promedió ~31K por video",
      tag: "Capacidad de pico, no línea base",
    },
    {
      label: "Instagram sube de nivel",
      value: "390",
      detail: "publicaciones guardadas en julio, con la mejor tasa de interacción de las 4 plataformas",
      tag: "Comunidad, no solo alcance",
    },
    {
      label: "Liga MX llega a Austin",
      value: "385,188",
      detail: "impresiones en Facebook + 2,849 compartidos en TikTok",
    },
    {
      label: "Video de bracket",
      value: "384,657",
      detail: "vistas y 806 comentarios en YouTube Shorts",
    },
  ] satisfies ProofPoint[],
  proofNote: "Formatos repetibles, no picos aislados.",

  caseStudy: {
    tag: "Ejemplo de activación de evento",
    title: "Liga MX llega a Austin",
    objective: "Generar cobertura, alcance y asistencia para un partido de Liga MX en el Q2 Stadium de Austin.",
    produced: "Cobertura y producción en sitio, más un video resumen distribuido en Facebook y TikTok.",
    result: "385,188 impresiones en Facebook + 2,849 compartidos en TikTok.",
  },

  partners: {
    past: ["POP MART Americas", "Play90Sports Live", "SoccerPost", "Nido Águila Austin"],
    formats: [
      "Video integrado",
      "Cobertura y producción de eventos",
      "Activación en sitio",
      "Publicaciones dedicadas",
    ],
    openInventory:
      "Leagues Cup 2026 y el camino al próximo ciclo mundialista ya están abiertos para patrocinio.",
  },

  rateCard: {
    packages: [
      {
        name: "Video integrado",
        includes: "1 video vertical con mención de marca, distribuido en las 4 plataformas",
        reach: "20K a 80K vistas por plataforma, según el tema",
      },
      {
        name: "Activación en evento",
        includes: "Cobertura y producción en sitio, más video resumen",
        reach: "40K a 90K vistas (referencia: Q2 Austin, 87K)",
      },
      {
        name: "Patrocinador presentador de jornada",
        includes: 'Gráfico "dónde ver" con tu marca en cada día de partido',
        reach: "Piso de 6K a 13K vistas por publicación, inventario diario",
      },
      {
        name: "Colaboración con creador",
        includes: "Video con creador invitado",
        reach: "Alcance medio, alta conversión a seguidores (aprox. 1%)",
      },
      {
        name: "Bracket o calendario patrocinado",
        includes: "Gráfico de mayor alcance con tu marca",
        reach: "Nuestro formato histórico de mayor alcance, hasta 384K en YouTube",
      },
    ] satisfies RatePackage[],
    note: "Precios según alcance y duración de campaña. Solicita nuestra tarifa.",
  },

  dataCaveats: [
    "Los \u201cnuevos seguidores\u201d de TikTok se calculan por la diferencia diaria del total de seguidores (11,835 \u2192 12,514), ya que el campo nativo de la plataforma reportó cero durante julio.",
    "El crecimiento de seguidores de Instagram (+343) es una cifra bruta de una ventana móvil de 30 días que expone la plataforma; no resta las bajas.",
  ],

  contact: {
    email: "info@accesofutbol.com",
    site: "accesofutbol.com",
    handle: "@accesofutbolmx",
    tiktokUrl: "https://www.tiktok.com/@accesofutbolmx",
  },
} as const;

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}
