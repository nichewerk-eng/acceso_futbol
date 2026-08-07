import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Canonical host = apex (matches siteConfig.url). Collapse www → non-www. */
export function middleware(req: NextRequest) {
  const host = req.headers.get('host')?.toLowerCase() ?? '';
  if (host === 'www.accesofutbol.com') {
    const url = req.nextUrl.clone();
    url.host = 'accesofutbol.com';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
