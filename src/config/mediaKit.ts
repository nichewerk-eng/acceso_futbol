// Single source of truth for the /mediakit page. Update the numbers here
// each reporting cycle. Nothing else in the media kit needs to change.

export type PlatformStat = {
  id: "facebook" | "tiktok" | "youtube" | "instagram";
  name: string;
  handle: string;
  metricLabel: string;
  metricValue: number;
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
    label: "Últimas 4 semanas · 2 al 28 de julio de 2026",
    note: "Cifras post-Mundial. Se excluyen deliberadamente el 30 de junio y el 1 de julio, dos días de pico impulsados por el Mundial 2026, para reflejar el comportamiento sostenido y repetible de la audiencia, no un pico no recurrente. Todas las cifras son verificables en las analíticas de cada plataforma.",
  },

  headline: {
    totalReach: 5207065,
    methodologyNote:
      "Suma de las impresiones de Facebook con las vistas de TikTok, YouTube e Instagram, cada una según la métrica nativa de su plataforma. No es un número deduplicado.",
    combinedAudience: 36459,
    netNewFollowers: 4051,
    creatorRewards: "Miembro del programa TikTok Creator Rewards",
    facebookReach: 1851809,
    facebookOrganicNote: "100% orgánico, sin pauta pagada",
    facebookEngagements: 105114,
    engagementBadges: [
      { value: "3.82%", label: "Interacción en TikTok" },
      { value: "2.74%", label: "Interacción en Facebook" },
    ],
  },

  platforms: [
    {
      id: "facebook",
      name: "Facebook",
      handle: "Acceso Futbol",
      metricLabel: "Impresiones",
      metricValue: 3660692,
      reachValue: 1851809,
      reachLabel: "Alcance, 100% orgánico",
      followers: 19748,
      followersLabel: "seguidores",
      growth: 2656,
      growthLabel: "nuevos en 4 semanas",
      secondaryMetric: { label: "Tasa de interacción", value: "2.74%" },
      positioning: "Alcance masivo binacional.",
    },
    {
      id: "tiktok",
      name: "TikTok",
      handle: "@accesofutbolmx",
      metricLabel: "Vistas",
      metricValue: 846058,
      followers: 12470,
      followersLabel: "seguidores",
      growth: 610,
      growthLabel: "nuevos en 4 semanas",
      secondaryMetric: { label: "Tasa de interacción", value: "3.82%" },
      badge: "Creator Rewards",
      positioning: "Audiencia adulta, 25 a 44 años, en Estados Unidos y México.",
    },
    {
      id: "youtube",
      name: "YouTube Shorts",
      handle: "Acceso Futbol",
      metricLabel: "Vistas",
      metricValue: 560903,
      followers: 2900,
      followersLabel: "suscriptores",
      growth: 508,
      growthLabel: "nuevos en 4 semanas",
      secondaryMetric: { label: "Tasa de visualización promedio", value: "55.4%" },
      positioning: "La mayor retención: ideal para integraciones largas.",
    },
    {
      id: "instagram",
      name: "Instagram",
      handle: "@accesofutbolmx",
      metricLabel: "Vistas",
      metricValue: 139412,
      followers: 1331,
      followersLabel: "seguidores",
      growth: 277,
      growthLabel: "nuevos en 4 semanas",
      positioning: "Premium, dividido en partes iguales entre México y Estados Unidos.",
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
      "Ciudad Juárez",
      "Puebla",
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
      "Fútbol femenil: cobertura de la Liga MX Femenil y momentos clave. Nuestra publicación de América Femenil campeonas alcanzó 25,479 vistas con 12.1% de interacción, muy por encima del promedio de la cuenta.",
    ],
    cadence: "1 a 3 publicaciones diarias, con más volumen en días de partido",
    formatNote: "Todo en video vertical, distribuido en las cuatro plataformas.",
  },

  proof: [
    {
      label: "Pico Mundial 2026",
      value: "2.5M",
      detail: "vistas en 30 días, +196% de crecimiento sobre el periodo anterior",
      tag: "Capacidad de pico, no línea base",
    },
    {
      label: "Video de bracket",
      value: "384,657",
      detail: "vistas y 806 comentarios en YouTube Shorts",
    },
    {
      label: "Liga MX llega a Austin",
      value: "385,188",
      detail: "impresiones en Facebook + 2,849 compartidos en TikTok",
    },
    {
      label: "Análisis de Rafa Márquez",
      value: "77,195",
      detail: "vistas en TikTok con 31.5% de retención",
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
