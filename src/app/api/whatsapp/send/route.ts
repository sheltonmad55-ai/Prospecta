import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser, AppError } from '@/server/auth';

const sendSchema = z.object({
  phone: z.string().min(6, 'Número de telefone inválido'),
  message: z.string().min(1, 'Mensagem não pode estar vazia').max(6000, 'Mensagem demasiado longa')
});

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const data = sendSchema.parse(body);

    let phone = String(data.phone || '').replace(/\D/g, '');
    const message = String(data.message || '').trim();

    if (phone.length === 9 && /^8[2-7]/.test(phone)) {
      phone = '258' + phone;
    }

    if (!phone || phone.length < 8) {
      throw new AppError('Número de telefone inválido.', 400);
    }

    const url = (process.env.EVOLUTION_API_URL || 'https://api.evolution.com').replace(/\/+$/, '');
    const apiKey = process.env.EVOLUTION_API_KEY || '';
    const instanceName = `prospecta_${user.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    const sendRes = await fetch(`${url}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
    });

    const sendData = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) {
      throw new AppError(sendData.message || sendData.error || 'Falha ao enviar mensagem pela Evolution API.', 400);
    }

    return NextResponse.json({
      ok: true,
      messageId: sendData.key?.id || sendData.messageId || 'sent',
      to: phone,
      timestamp: Date.now()
    }, { status: 200 });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha ao enviar mensagem pelo WhatsApp.';
    const status = error instanceof AppError ? error.status : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
