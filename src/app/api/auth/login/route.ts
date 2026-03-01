import { NextResponse } from 'next/server';

async function hashSession(password: string): Promise<string> {
  const secret = process.env.SESSION_SECRET || 'perplexica-session';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(password));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request: Request) {
  const authPassword = process.env.AUTH_PASSWORD;

  if (!authPassword) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { password } = body;

  if (password !== authPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const sessionToken = await hashSession(authPassword);
  const response = NextResponse.json({ success: true });

  response.cookies.set('auth_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
