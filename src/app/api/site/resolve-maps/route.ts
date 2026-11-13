import { NextResponse } from 'next/server';
import { requireActivePlan, AppError } from '@/server/auth';
import { resolveGoogleMapsUrl } from '@/server/maps-resolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await requireActivePlan(request);
    const body = await request.json().catch(() => ({}));
    const url = body.url || '';

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL do Google Maps não indicada.' }, { status: 400 });
    }

    const resolved = await resolveGoogleMapsUrl(url);
    return NextResponse.json({
      success: true,
      ...resolved
    });
  } catch (error: any) {
    const status = error instanceof AppError ? error.status : 400;
    return NextResponse.json({ error: error.message || 'Erro ao resolver link do Google Maps.' }, { status });
  }
}

