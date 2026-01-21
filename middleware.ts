import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/admin/login',
    '/auth/callback',
    '/reset-password',
    '/setup-required',
  ];

  // Static files and API routes - allow through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  // Allow public paths
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Root path - redirect to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // For all other routes, let client-side handle auth
  // Middleware should be minimal to avoid blocking legitimate requests
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
