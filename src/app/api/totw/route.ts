import { serveSwr } from '@/lib/serveSwr';
import { getTotwBoard, type TotwBoard } from '@/lib/sports/totw';

const CACHE_KEY = (jornada: number | null) =>
  jornada != null ? `totw-v18-faces-j${jornada}` : 'totw-v18-faces-latest';

function parseJornada(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export async function GET(req: Request) {
  const jornada = parseJornada(new URL(req.url).searchParams.get('jornada'));
  return serveSwr<TotwBoard>({
    key: CACHE_KEY(jornada),
    ttlMs: 10 * 60_000,
    staleOk: true,
    loader: () => getTotwBoard(jornada),
    headers: () => ({
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
    }),
  });
}
