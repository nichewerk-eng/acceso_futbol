import type { NextRequest } from 'next/server';
import { mediaKitShareImage } from '@/lib/mediakit/shareImage';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return mediaKitShareImage(request.nextUrl.searchParams.get('lang') === 'en');
}
