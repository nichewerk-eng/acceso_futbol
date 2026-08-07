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
    "Acceso Futbol: noticias, resultados, horarios, tabla, análisis y contenido de Liga MX, Selección Mexicana y Leagues Cup para aficionados en México y Estados Unidos.",
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
  social: {
    tiktok: "https://www.tiktok.com/@accesofutbolmx",
    instagram: "https://www.instagram.com/accesofutbolmx",
    facebook: "https://www.facebook.com/accesofutbol",
    youtube: "https://www.youtube.com/@accesofutbolmx",
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
    "Acceso Futbol",
    "Acceso Radio",
    "fútbol mexicano Estados Unidos",
  ],
} as const;
