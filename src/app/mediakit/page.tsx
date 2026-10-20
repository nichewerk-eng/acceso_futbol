import type { Metadata } from 'next';
import MediaKitView from '@/components/mediakit/MediaKitView';
import { absoluteUrl } from '@/lib/seo';

type Query = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Query): Promise<Metadata> {
  const english = (await searchParams).lang === 'en';
  const title = english ? 'Acceso Futbol · Sponsorship Media Kit' : 'Acceso Futbol · Media kit para marcas';
  const description = english
    ? 'Connect your brand with Mexican football fans in Mexico and the U.S. Explore Spanish-language content, campaign formats and sponsorship options.'
    : 'Conecta tu marca con la afición del fútbol mexicano en México y Estados Unidos. Descubre contenido en español, formatos y opciones de patrocinio.';
  const image = {
    // Explicit version gives social crawlers a fresh image URL after publication.
    url: absoluteUrl(english ? '/mediakit/share-image?lang=en&v=1' : '/mediakit/share-image?v=1'),
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: english
      ? 'Acceso Futbol Media Kit. Bold editorial cover with an AF presenter, for brands reaching Mexican football fans.'
      : 'Media Kit de Acceso Futbol. Portada editorial con un presentador de AF, para marcas que buscan conectar con la afición del fútbol mexicano.',
  };
  const url = absoluteUrl(english ? '/mediakit?lang=en' : '/mediakit');

  return {
    title: english ? 'Sponsorship Media Kit' : 'Media kit y patrocinios',
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: url,
      languages: { es: absoluteUrl('/mediakit'), en: absoluteUrl('/mediakit?lang=en') },
    },
    openGraph: {
      title, description, url, type: 'website', siteName: 'Acceso Futbol',
      locale: english ? 'en_US' : 'es_MX', alternateLocale: english ? 'es_MX' : 'en_US',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function MediaKitPage({ searchParams }: Query) {
  const { lang } = await searchParams;
  return <MediaKitView locale={lang === 'en' ? 'en' : 'es'} />;
}
