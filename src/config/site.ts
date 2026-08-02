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
    "Pulso en vivo de Liga MX, Leagues Cup y la Selección Mexicana: marcadores, crónica, dónde ver y Acceso Radio. Fútbol mexicano para México y EE.UU.",
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
