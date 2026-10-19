export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { getUserAsync, ensureUserAndWorkspace, supabaseConfigured, sessionToken, encodeSignedSession, cookie } from '@/server/auth';
import { googleConfigured } from '@/server/google-oauth';
import { mode } from '@/server/providers';

export async function GET(request: Request) {
  try {
    const user = await getUserAsync(request);
    const validUser = user ? ensureUserAndWorkspace(user) : null;

    const token = validUser ? (
      (sessionToken(request).startsWith('ps_') ? sessionToken(request) : null) || encodeSignedSession(validUser.id)
    ) : null;

    const response = NextResponse.json({
      user: validUser,
      token,
      mode: mode(),
      capabilities: {
        demo: false,
        google: googleConfigured(),
        ai: !!process.env.GEMINI_API_KEY,
        data: process.env.APIFY_TOKEN ? 'authorized-dataset' : 'authorized-csv',
        payments: false,
        email: supabaseConfigured() ? 'supabase' : 'local-outbox'
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });

    if (validUser && token) {
      const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
      const isHttps = isProd || request.url.startsWith('https:') || request.headers.get('x-forwarded-proto') === 'https';
      response.cookies.set('prospecta_session', token, {
        path: '/',
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 dias
      });
      response.headers.set('Set-Cookie', cookie(token, request));
    }

    return response;
  } catch (error) {
    console.error('[API /api/me Error]:', error);
    return NextResponse.json({
      user: null,
      mode: 'live',
      capabilities: {
        demo: false,
        google: false,
        ai: false,
        data: 'authorized-csv',
        payments: false,
        email: 'local-outbox'
      }
    }, { status: 200 });
  }
}
