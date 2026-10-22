import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, AppError } from '@/server/auth';
import { sendWhatsAppMessage } from '@/server/whatsapp';

const sendSchema = z.object({
  phone: z.string().min(6, 'Número de telefone inválido'),
  message: z.string().min(1, 'Mensagem não pode estar vazia').max(6000, 'Mensagem demasiado longa')
});

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const data = sendSchema.parse(body);

    const result = await sendWhatsAppMessage(user.id, data.phone, data.message);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha ao enviar mensagem pelo WhatsApp.';
    const status = error instanceof AppError ? error.status : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
