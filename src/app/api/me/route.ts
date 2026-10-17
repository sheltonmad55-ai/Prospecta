import { NextResponse } from 'next/server';
import { getUserAsync, ensureUserAndWorkspace, supabaseConfigured } from '@/server/auth';
import { googleConfigured } from '@/server/google-oauth';
import { mode } from '@/server/providers';

export async function GET(request: Request) {
  try {
    const user = await getUserAsync(request);
    const validUser = user ? ensureUserAndWorkspace(user) : null;

    return NextResponse.json({
      user: validUser,
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
