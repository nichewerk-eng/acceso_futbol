export const brandColors = {
  orange: "#f54f1b",
  orangeDark: "#d64517",
  blue: "#1e223d",
  teal: "#035352",
  yellow: "#f3e8bc",
  bg1: "#f6f5f2",
  bg2: "#ffffff",
  bg3: "#eceae5",
  white: "#ffffff",
} as const;

export const siteConfig = {
  name: "Acceso Futbol",
  legalName: "Acceso Futbol LLC",
  tagline: "Tu acceso al fútbol mexicano.",
  taglineEn: "Mexican soccer media. Unfiltered. On your feed.",
  description:
    "Acceso Futbol: noticias, resultados, horarios, tabla, análisis y contenido de Liga MX, Selección Mexicana y Leagues Cup para aficionados en México y Estados Unidos.",
  /** Primary host on Vercel is www. Apex must 308 → www (not 307). Keep canonicals aligned. */
  url: "https://www.accesofutbol.com",
  email: "hello@accesofutbol.com",
  founded: 2026,
  worldCup: {
    date: "11 de junio de 2026",
    venue: "Estadio Banorte",
    headline: "México abre el Mundial 2026",
  },
  tiktok: {
    username: "accesofutbolmx",
    videoIds: [] as string[],
    get profileUrl() {
      return `https://www.tiktok.com/@${this.username}`;
    },
  },
  social: {
    tiktok: "https://www.tiktok.com/@accesofutbolmx",
    instagram: "https://www.instagram.com/accesofutbolmx/",
    facebook: "https://www.facebook.com/accesofutbol",
    youtube: "https://www.youtube.com/@AccesoFutbolMx",
  },
  seoKeywords: [
    "Liga MX",
    "Liga MX en vivo",
    "Liga MX tabla",
    "Liga MX jornada",
    "Leagues Cup",
    "Leagues Cup 2026",
    "dónde ver Leagues Cup",
    "Selección Mexicana",
    "El Tri",
    "Mundial 2026 México",
    "fútbol mexicano",
    "resultados Liga MX",
    "Liga MX horarios",
    "horarios Liga MX",
    "calendario Liga MX",
    "horarios Liga MX Acceso Futbol",
    "Acceso Futbol",
    "Acceso Radio",
    "fútbol mexicano Estados Unidos",
  ],
} as const;

export const SOCIAL_CHANNELS = [
  {
    id: 'tiktok',
    label: 'TikTok',
    handle: '@accesofutbolmx',
    href: siteConfig.social.tiktok,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@accesofutbolmx',
    href: siteConfig.social.instagram,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    handle: '@AccesoFutbolMx',
    href: siteConfig.social.youtube,
  },
] as const;
