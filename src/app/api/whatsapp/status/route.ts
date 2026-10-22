import { NextResponse } from 'next/server';
import { requireUser, AppError } from '@/server/auth';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const url = (process.env.EVOLUTION_API_URL || 'https://api.evolution.com').replace(/\/+$/, '');
    const apiKey = process.env.EVOLUTION_API_KEY || '';
    const instanceName = `prospecta_${user.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    const res = await fetch(`${url}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json().catch(() => ({}));
    const state = data.instance?.state || data.state || 'close';
    const connected = state === 'open';

    return NextResponse.json({
      ok: true,
      connected,
      status: connected ? 'connected' : 'disconnected',
      user: data.instance?.ownerJid || data.ownerJid || null
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha ao verificar status do WhatsApp na Evolution API.';
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ ok: false, connected: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
