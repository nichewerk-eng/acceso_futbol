import type { Metadata } from 'next';
import { PulseHome } from '@/components/living-room/PulseHome';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Acceso Futbol | Donde vive el fútbol mexicano',
  description: siteConfig.description,
  alternates: { canonical: siteConfig.url },
  openGraph: {
    title: 'Acceso Futbol | Donde vive el fútbol mexicano',
    description: siteConfig.description,
    url: siteConfig.url,
  },
};

export default function RootPage() {
  return <PulseHome />;
}
