import { NextResponse } from 'next/server';

async function hashSession(password: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn('[Auth] SESSION_SECRET not set — using AUTH_PASSWORD-derived key. Set SESSION_SECRET for stronger security.');
  }
  const signingKey = secret || process.env.AUTH_PASSWORD || 'perplexica-session';
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

async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.length !== bBuf.length) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    crypto.getRandomValues(new Uint8Array(32)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, aBuf),
    crypto.subtle.sign('HMAC', key, bBuf),
  ]);
  const arrA = new Uint8Array(sigA);
  const arrB = new Uint8Array(sigB);
  let result = 0;
  for (let i = 0; i < arrA.length; i++) {
    result |= arrA[i] ^ arrB[i];
  }
  return result === 0;
}

export async function POST(request: Request) {
  const authPassword = process.env.AUTH_PASSWORD;

  if (!authPassword) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { password } = body;

  const isValid = await timingSafeCompare(password || '', authPassword);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const sessionToken = await hashSession(authPassword);
  const response = NextResponse.json({ success: true });

  const isHttps = request.url.startsWith('https://');

  response.cookies.set('auth_session', sessionToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
