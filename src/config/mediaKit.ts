// Single source of truth for the /mediakit page. Update the numbers here
// each reporting cycle. Nothing else in the media kit needs to change.

export type PlatformStat = {
  id: "facebook" | "tiktok" | "youtube" | "instagram";
  name: string;
  handle: string;
  metricLabel: string;
  metricValue: number;
  followers: number;
  followersLabel: string;
  growth: number;
  growthLabel: string;
  secondaryMetric?: { label: string; value: string };
  badge?: string;
};

export type ProofPoint = {
  label: string;
  value: string;
  detail: string;
  tag?: string;
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
    totalReach: 5242745,
    methodologyNote:
      "Suma de las impresiones de Facebook con las vistas de TikTok, YouTube e Instagram, cada una según la métrica nativa de su plataforma. No es un número deduplicado.",
    combinedAudience: 36459,
    netNewFollowers: 4051,
    creatorRewards: "Miembro del programa TikTok Creator Rewards",
  },

  platforms: [
    {
      id: "facebook",
      name: "Facebook",
      handle: "Acceso Futbol",
      metricLabel: "Impresiones",
      metricValue: 3696372,
      followers: 19758,
      followersLabel: "seguidores",
      growth: 2656,
      growthLabel: "nuevos en 4 semanas",
      secondaryMetric: { label: "Tasa de interacción", value: "2.74%" },
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
    },
  ] satisfies PlatformStat[],

  demographics: {
    facebook: { men: 89, age35Plus: 73.5, mexico: 80.6 },
    tiktok: { men: 86, age35Plus: 50.1, unitedStates: 36 },
    instagram: { age25to54: 70, splitNote: "Dividido en partes iguales entre México y Estados Unidos" },
    summary: "Audiencia adulta de alto poder adquisitivo, no una audiencia adolescente.",
    verticals: [
      "Apuestas deportivas",
      "Cerveza",
      "Telecomunicaciones",
      "Automotriz",
      "Servicios financieros",
    ],
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
    usMetros: ["Austin", "Houston", "Los Ángeles", "Dallas", "Chicago"],
    austin: {
      igShare: 7.7,
      texasShare: 10.1,
      tiktokRank: 4,
    },
    activationNote: "Fuerte encaje para activaciones en eventos de Texas y programación de Q2 en estadios.",
  },

  content: {
    formats: [
      "Reacción post-partido, análisis táctico y narrativas de jugadores",
      "Previas de partidos con horarios y canales de transmisión en México y Estados Unidos",
      "Gráficos de brackets y calendarios: nuestro formato de mayor alcance",
      "Entrevistas con creadores y cobertura de eventos en vivo",
    ],
    cadence: "1 a 3 publicaciones diarias, con más volumen en días de partido",
    formatNote: "Todo en video vertical, distribuido en las cuatro plataformas.",
  },

  proof: [
    {
      label: "Pico Mundial 2026",
      value: "2.5M",
      detail: "vistas en 28 días, +196% de crecimiento sobre el periodo anterior",
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
