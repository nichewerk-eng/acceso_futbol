import { NextResponse } from 'next/server';
import { geoFromHeaders } from '@/lib/analytics/geo';
import { trackServer } from '@/lib/analytics/trackServer';

export const dynamic = 'force-dynamic';

/** One ping per session from CityPulse — city + country for Analytics → Events. */
export async function POST(req: Request) {
  const geo = geoFromHeaders(req.headers);
  if (!geo) return new NextResponse(null, { status: 204 });

  await trackServer('City', { city: geo.city, country: geo.country });
  return NextResponse.json(
    { ok: true, city: geo.city, country: geo.country },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
