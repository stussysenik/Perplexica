import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function hashSession(password: string): Promise<string> {
  const signingKey = process.env.SESSION_SECRET || process.env.AUTH_PASSWORD || 'perplexica-session';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(password));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(request: NextRequest) {
  const authPassword = process.env.AUTH_PASSWORD;

  if (!authPassword) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (
    pathname === '/login' ||
    pathname === '/api/auth/login' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/weather-ico/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/icon') ||
    pathname === '/manifest.webmanifest'
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('auth_session');
  const expectedToken = await hashSession(authPassword);

  if (sessionCookie?.value === expectedToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
