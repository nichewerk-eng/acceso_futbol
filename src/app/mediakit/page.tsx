import type { Metadata } from 'next';
import MediaKitView from '@/components/mediakit/MediaKitView';
import { absoluteUrl } from '@/lib/seo';

const spanishMetadata: Metadata = {
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

type Query = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Query): Promise<Metadata> {
  const english = (await searchParams).lang === 'en';
  return {
    ...spanishMetadata,
    ...(english ? {
      title: 'Mexican football sponsorships · Media Kit',
      description: 'Connect your brand with Liga MX and El Tri fans in Mexico and the U.S. Explore results, formats and request a sponsorship proposal.',
      openGraph: { ...spanishMetadata.openGraph, title: 'Mexican football sponsorships | Acceso Futbol', description: 'Spanish-language campaigns across four platforms, with reporting by asset.', locale: 'en_US', url: absoluteUrl('/mediakit?lang=en') },
      twitter: { card: 'summary_large_image', title: 'Sponsorships | Acceso Futbol', images: ['/logo.png'] },
    } : {}),
    alternates: {
      canonical: absoluteUrl(english ? '/mediakit?lang=en' : '/mediakit'),
      languages: { es: absoluteUrl('/mediakit'), en: absoluteUrl('/mediakit?lang=en') },
    },
  };
}

export default async function MediaKitPage({ searchParams }: Query) {
  const { lang } = await searchParams;
  return <MediaKitView locale={lang === 'en' ? 'en' : 'es'} />;
}
