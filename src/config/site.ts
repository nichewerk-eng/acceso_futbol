export const brandColors = {
  orange: "#e05a0c",
  orangeDark: "#c44c0a",
  teal: "#5c6368",
  blue: "#1e4fa0",
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
    "Opinión caliente, micro-análisis y narrativas de Liga MX y la Selección Mexicana. Síguenos en TikTok antes del Mundial 2026.",
  url: "https://accesofutbol.com",
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
