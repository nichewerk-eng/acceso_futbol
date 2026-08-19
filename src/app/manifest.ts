import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Acceso Futbol',
    short_name: 'AccesoFutbol',
    description: 'Liga MX, Leagues Cup y fútbol mexicano en tiempo real',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f5f2',
    theme_color: '#f54f1b',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/AccesoFutbol_Primary_Color_Transparent.png',
        sizes: '1254x1254',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: '/logo.png', sizes: '512x331', type: 'image/png', purpose: 'any' },
    ],
    categories: ['sports', 'entertainment'],
    lang: 'es-MX',
    dir: 'ltr',
    shortcuts: [
      { name: 'Pulso', short_name: 'Pulso', url: '/', description: 'Sala de estar Acceso' },
      { name: 'Liga MX', short_name: 'Liga MX', url: '/liga-mx', description: 'Tabla y jornada Liga MX' },
      {
        name: 'Liga MX Femenil',
        short_name: 'Femenil',
        url: '/liga-mx-femenil',
        description: 'Tabla y jornada Liga MX Femenil',
      },
      {
        name: 'Leagues Cup',
        short_name: 'Cup',
        url: '/leagues-cup',
        description: 'MLS × Liga MX',
      },
    ],
  };
}
