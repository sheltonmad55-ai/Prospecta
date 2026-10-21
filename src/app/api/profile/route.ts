import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, saveUserProfile, ensureUserAndWorkspace, cookie, sessionToken, encodeSignedSession } from '@/server/auth';
import { PROVINCES } from '@/lib/contracts';
import { validPhone } from '@/server/providers';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const validUser = ensureUserAndWorkspace(user);
    return NextResponse.json({
      success: true,
      user: validUser,
      profile: validUser.profile
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sessão expirada.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  service: z.string().min(2).max(120).default('Criação de websites'),
  pitch: z.string().max(1000).default(''),
  province: z.string().refine(s => !s || PROVINCES.includes(s as typeof PROVINCES[number])).default(''),
  phone: z.string().max(30).default(''),
  nationwide: z.boolean().default(true),
  onboarded: z.boolean().default(true)
});

async function handleSaveProfile(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const data = profileSchema.parse(body);

    if (data.phone && !validPhone(data.phone)) {
      return NextResponse.json({ error: 'Indique um número válido (ex: Moçambique +258, Angola +244, Portugal +351, Brasil +55).' }, { status: 400 });
    }

    const updatedUser = await saveUserProfile(user.id, {
      name: data.name,
      service: data.service,
      pitch: data.pitch,
      province: data.province,
      phone: data.phone ? validPhone(data.phone) || '' : '',
      nationwide: data.nationwide,
      onboarded: data.onboarded
    });

    // Refresh and keep session cookies alive for 30 days
    const token = (sessionToken(request).startsWith('ps_') ? sessionToken(request) : null) || encodeSignedSession(user.id);

    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      token
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    });

    const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
    const isHttps = isProd || request.url.startsWith('https:') || request.headers.get('x-forwarded-proto') === 'https';
    response.cookies.set('prospecta_session', token, {
      path: '/',
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30
    });
    response.headers.set('Set-Cookie', cookie(token, request));

    return response;
  } catch (error) {
    console.error('[API /api/profile Error]:', error);
    const message = error instanceof Error ? error.message : 'Não foi possível guardar o perfil.';
    const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  return handleSaveProfile(request);
}

export async function PUT(request: Request) {
  return handleSaveProfile(request);
}
