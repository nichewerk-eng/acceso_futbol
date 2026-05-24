export const brandColors = {
  orange: "#f07820",
  orangeDark: "#d06010",
  teal: "#1a7a78",
  blue: "#1e4fa0",
  bg1: "#030f10",
  bg2: "#0c2d30",
  bg3: "#051a1c",
  white: "#ffffff",
} as const;

export const siteConfig = {
  name: "Acceso Futbol",
  legalName: "Acceso Futbol LLC",
  tagline: "Tu acceso al fútbol mexicano.",
  taglineEn: "Mexican soccer media. Unfiltered. On your feed.",
  description:
    "Opinión caliente, micro-análisis y narrativas de Liga MX y la Selección Mexicana. Síguenos en TikTok antes del Mundial 2026.",
  url: "https://accesofutbol.com",
  email: "jon@accesofutbol.com",
  founded: 2026,
  location: "Austin / Buda, Texas, USA",
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
  seoKeywords: [
    "Liga MX noticias",
    "Selección Mexicana análisis",
    "Fútbol mexicano TikTok",
    "Liga MX en español",
    "El Tri noticias 2026",
    "Mundial 2026 México",
    "Acceso Futbol",
    "Fútbol mexicano Estados Unidos",
  ],
} as const;
