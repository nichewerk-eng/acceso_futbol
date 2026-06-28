import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Acceso Futbol',
    short_name: 'AccesoFutbol',
    description: 'Liga MX, Selección Mexicana y Mundial 2026 en tiempo real',
    start_url: '/tabla',
    display: 'standalone',
    background_color: '#030f10',
    theme_color: '#f07820',
    orientation: 'portrait-primary',
    icons: [
      { src: '/logo.png',   sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/logo.png',   sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    categories: ['sports', 'entertainment'],
    lang: 'es-MX',
    dir: 'ltr',
    shortcuts: [
      { name: 'Liga MX',       short_name: 'Liga MX',   url: '/liga-mx',   description: 'Tabla de posiciones Liga MX' },
      { name: 'Selección',     short_name: 'El Tri',    url: '/seleccion', description: 'Selección Mexicana' },
      { name: 'Mundial 2026',  short_name: 'Mundial',   url: '/tabla',     description: 'FIFA World Cup 2026' },
    ],
  };
}
