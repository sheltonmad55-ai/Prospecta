import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';

export const CANONICAL_HOST = 'prospecta-mz.vercel.app';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || request.nextUrl.host || '';
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

  // In production, consolidate any preview/secondary vercel domains onto canonical prospecta-mz.vercel.app
  if (isProd && host.endsWith('.vercel.app') && host !== CANONICAL_HOST) {
    const canonicalUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(canonicalUrl, { status: 308 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
