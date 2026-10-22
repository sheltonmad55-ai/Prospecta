import { NextResponse } from 'next/server';
import { requireUser, AppError } from '@/server/auth';

function getEvolutionConfig(userId: string) {
  const url = process.env.EVOLUTION_API_URL || 'https://api.evolution.com';
  const apiKey = process.env.EVOLUTION_API_KEY || '';
  const instanceName = `prospecta_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  return { url: url.replace(/\/+$/, ''), apiKey, instanceName };
}

async function ensureInstanceExists(url: string, apiKey: string, instanceName: string) {
  try {
    const res = await fetch(`${url}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json();
      const instances = Array.isArray(data) ? data : (data.instances || data.data || []);
      const exists = instances.some((i: any) => i.instance?.instanceName === instanceName || i.instanceName === instanceName);
      if (exists) return true;
    }
  } catch {}

  // Create instance if not found
  try {
    const createRes = await fetch(`${url}/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true
      })
    });
    return createRes.ok;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { url, apiKey, instanceName } = getEvolutionConfig(user.id);

    await ensureInstanceExists(url, apiKey, instanceName);

    const connectRes = await fetch(`${url}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await connectRes.json().catch(() => ({}));

    // Evolution API typically returns qrcode base64 or pairing code
    // Check various formats: data.base64, data.qrcode?.base64, data.code
    const qrDataUrl = data.base64 || data.qrcode?.base64 || data.code || null;
    const connected = data.instance?.state === 'open' || data.state === 'open' || data.connected === true;

    return NextResponse.json({
      ok: true,
      connected,
      status: connected ? 'connected' : (qrDataUrl ? 'waiting_qr' : 'connecting'),
      qrDataUrl,
      user: data.ownerJid || data.instance?.ownerJid || null
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Falha ao conectar Evolution API.';
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
