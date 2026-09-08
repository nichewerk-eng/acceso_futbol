import { Metadata } from 'next';
import { SiteFooter } from '@/components/home/SiteFooter';
import ElTriView from '@/components/eltri/ElTriView';
import { PulseNav } from '@/components/living-room/PulseNav';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';
import { buildElTriBoard, elTriFriendlyIds } from '@/lib/sports/elTriBoard';
import { fetchSeleccionSchedule } from '@/lib/sports/seleccion';
import type { Fixture } from '@/lib/sports/types';

export const metadata: Metadata = {
  title: 'El Tri · calendario amistosos internacionales y dónde ver',
  description:
    'Calendario oficial de la Selección Mexicana: amistosos internacionales de septiembre y octubre 2026, horarios y TV.',
  alternates: { canonical: absoluteUrl('/el-tri') },
  openGraph: {
    title: 'Calendario El Tri · Acceso Futbol',
    description: 'Amistosos internacionales: México vs Colombia, Perú, USA y Chile.',
    url: absoluteUrl('/el-tri'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Calendario El Tri · Acceso Futbol',
    description: 'Amistosos internacionales: México vs Colombia, Perú, USA y Chile.',
  },
};

export const revalidate = 120;

async function loadFixtures(): Promise<Fixture[]> {
  try {
    const ids = elTriFriendlyIds();
    const all = await fetchSeleccionSchedule();
    const rows = all.filter((f) => ids.has(f.id));
    return rows.length ? rows : buildElTriBoard([]);
  } catch {
    return buildElTriBoard([]);
  }
}

export default async function ElTriPage() {
  const fixtures = await loadFixtures();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Pulso', path: '/' },
          { name: 'El Tri', path: '/el-tri' },
        ])}
      />
      <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
        <PulseNav />
        <main className="flex-1">
          <ElTriView initialFixtures={fixtures} />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
