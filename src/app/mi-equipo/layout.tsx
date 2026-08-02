import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Mi equipo',
  description: 'Elige tus clubes de Liga MX para gravitar el pulso Acceso Futbol.',
  alternates: { canonical: absoluteUrl('/mi-equipo') },
  robots: { index: false, follow: false },
};

export default function MiEquipoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
