import { NextResponse } from 'next/server';
import { requireUser, AppError } from '@/server/auth';

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const url = (process.env.EVOLUTION_API_URL || 'https://api.evolution.com').replace(/\/+$/, '');
    const apiKey = process.env.EVOLUTION_API_KEY || '';
    const instanceName = `prospecta_${user.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    // Forward to disconnect
    let logoutRes = await fetch(`${url}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    }).catch(() => null);

    if (!logoutRes || !logoutRes.ok) {
      await fetch(`${url}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        }
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      message: 'Sessão encerrada com sucesso.'
    }, { status: 200 });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha ao terminar sessão.';
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
