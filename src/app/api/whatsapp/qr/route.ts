import { NextResponse } from 'next/server';
import { requireUser, AppError } from '@/server/auth';
import { getWhatsAppQr } from '@/server/whatsapp';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const result = await getWhatsAppQr(user.id);
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha ao obter QR Code do WhatsApp.';
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
