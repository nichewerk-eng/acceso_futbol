import type { Metadata } from 'next';
import MediaKitView from '@/components/mediakit/MediaKitView';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Patrocinios de fútbol mexicano · Media Kit',
  description: 'Conecta tu marca con fans de Liga MX y El Tri en México y Estados Unidos. Consulta resultados, formatos y escríbenos para recibir una propuesta de patrocinio.',
  alternates: { canonical: absoluteUrl('/mediakit') },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Patrocinios de fútbol mexicano | Acceso Futbol',
    description: 'Campañas en español, cuatro plataformas y resultados por pieza. Escríbenos para recibir una propuesta para tu marca.',
    url: absoluteUrl('/mediakit'),
    images: [{ url: '/logo.png', width: 512, height: 331, alt: 'Acceso Futbol · Patrocinios' }],
  },
  twitter: { card: 'summary_large_image', title: 'Patrocinios | Acceso Futbol', images: ['/logo.png'] },
};

export default function MediaKitPage() {
  return <MediaKitView />;
}
