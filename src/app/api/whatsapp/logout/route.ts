import { NextResponse } from 'next/server';
import { requireUser, AppError } from '@/server/auth';
import { disconnectWhatsApp } from '@/server/whatsapp';

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const result = await disconnectWhatsApp(user.id);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha ao desconectar WhatsApp.';
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
