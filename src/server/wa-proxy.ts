import { NextResponse } from 'next/server';
import { requireUser, AppError } from '@/server/auth';
import type { User } from '@/lib/contracts';

export function getWhatsAppServiceConfig() {
  const url = (process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const apiKey = process.env.WHATSAPP_SERVICE_KEY || process.env.API_KEY || '';
  return { url, apiKey };
}

/**
 * Encaminha uma chamada autenticada para o microserviço dedicado de WhatsApp
 */
export async function forwardToWhatsAppService(
  request: Request,
  pathSegments: string[],
  overrideBody?: any
) {
  let user: User;
  try {
    user = await requireUser(request);
  } catch (authErr: any) {
    const status = authErr instanceof AppError ? authErr.status : 401;
    return NextResponse.json({ ok: false, error: authErr.message || 'Não autorizado.' }, { status });
  }

  const { url, apiKey } = getWhatsAppServiceConfig();
  const method = request.method;

  // Resolve o caminho de destino no microserviço
  const first = pathSegments[0] || 'status';
  let targetPath = '';

  if (first === 'status') {
    targetPath = `/sessions/${encodeURIComponent(user.id)}/status`;
  } else if (first === 'connect' || first === 'qr') {
    targetPath = `/sessions/${encodeURIComponent(user.id)}/connect`;
  } else if (first === 'logout' || first === 'disconnect') {
    targetPath = `/sessions/${encodeURIComponent(user.id)}/logout`;
  } else if (first === 'send') {
    targetPath = `/sessions/${encodeURIComponent(user.id)}/send`;
  } else if (first === 'campaigns') {
    // Sub-rotas de campanhas (/api/wa/campaigns, /api/wa/campaigns/:id, /api/wa/campaigns/:id/pause, etc.)
    const rest = pathSegments.slice(1).join('/');
    targetPath = rest ? `/campaigns/${rest}` : '/campaigns';
  } else {
    targetPath = `/${pathSegments.join('/')}`;
  }

  // Prepara o body
  let bodyPayload = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    if (overrideBody !== undefined) {
      bodyPayload = overrideBody;
    } else {
      try {
        bodyPayload = await request.json();
      } catch {
        bodyPayload = {};
      }
    }

    // Se for criação de campanha, garante que o userId é o do utilizador autenticado
    if (first === 'campaigns' && pathSegments.length === 1 && method === 'POST') {
      bodyPayload.userId = user.id;
    }
  }

  const targetUrl = `${url}${targetPath}`;

  try {
    // Timeout de 25 segundos para suportar cold starts em servidores gratuitos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    };

    const serviceResponse = await fetch(targetUrl, {
      method,
      headers,
      body: bodyPayload ? JSON.stringify(bodyPayload) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    const data = await serviceResponse.json().catch(() => ({}));

    // Se o serviço devolver estado de QR ou de conexão, garante compatibilidade de chaves
    if (data && typeof data === 'object') {
      // Normaliza 'state' para os formatos consumidos pelo frontend
      if (data.state === 'qr' && data.qr && !data.qrDataUrl) {
        data.qrDataUrl = data.qr;
      }
      if (data.state === 'connected') {
        data.connected = true;
      } else if (data.state === 'disconnected' || data.state === 'qr' || data.state === 'connecting') {
        data.connected = false;
      }
      if (!data.status && data.state) {
        data.status = data.state === 'qr' ? 'waiting_qr' : data.state;
      }
      if (data.phone && !data.user) {
        data.user = data.phone;
      }
    }

    return NextResponse.json(data, {
      status: serviceResponse.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (fetchErr: any) {
    const isTimeout = fetchErr?.name === 'AbortError';
    console.warn(`[WA Proxy Error] Falha ao contactar microserviço em ${targetUrl}:`, fetchErr.message);

    return NextResponse.json(
      {
        ok: false,
        connected: false,
        status: 'connecting',
        wakingUp: true,
        error: isTimeout
          ? 'O servidor de WhatsApp está a acordar (arranque a frio). Por favor, aguarde cerca de 30-45 segundos e tente novamente.'
          : 'A ligar ao servidor de WhatsApp, aguarde cerca de 1 minuto...',
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
