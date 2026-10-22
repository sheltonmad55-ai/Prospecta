import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
// @ts-ignore
import QRCode from 'qrcode';
import * as baileys from '@whiskeysockets/baileys';
import { AppError } from './auth';

const makeWASocket = (baileys as any).default || (baileys as any).makeWASocket;
const { useMultiFileAuthState, DisconnectReason } = baileys as any;

export interface UserWhatsAppSession {
  userId: string;
  sock: any;
  status: 'idle' | 'connecting' | 'waiting_qr' | 'connected' | 'disconnected';
  qr: string | null;
  qrDataUrl: string | null;
  userPhone: string | null;
  lastActive: number;
  qrWaiters: Array<(result: { ok: boolean; qrDataUrl?: string | null; connected?: boolean; user?: string | null; status: string; message?: string }) => void>;
}

declare global {
  // eslint-disable-next-line no-var
  var __prospecta_whatsapp_sessions: Map<string, UserWhatsAppSession> | undefined;
}

const sessions: Map<string, UserWhatsAppSession> =
  globalThis.__prospecta_whatsapp_sessions ||
  (globalThis.__prospecta_whatsapp_sessions = new Map<string, UserWhatsAppSession>());

/**
 * Returns isolated directory for each user's Baileys auth credentials.
 * On Vercel, uses /tmp/sessions/${userId} as required.
 */
export function getUserSessionDir(userId: string): string {
  const safeId = (userId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const baseDir = process.env.VERCEL
    ? path.join('/tmp', 'sessions')
    : (process.platform === 'win32'
        ? path.join(process.cwd(), '.whatsapp-sessions')
        : path.join('/tmp', 'sessions'));

  const userDir = path.join(baseDir, safeId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return userDir;
}

/**
 * Initializes or retrieves an active Baileys socket for the specific user.
 */
export async function initWhatsAppSession(userId: string): Promise<UserWhatsAppSession> {
  let session = sessions.get(userId);

  if (session && (session.status === 'connected' || session.status === 'connecting' || session.status === 'waiting_qr')) {
    return session;
  }

  const sessionDir = getUserSessionDir(userId);

  session = {
    userId,
    sock: null,
    status: 'connecting',
    qr: null,
    qrDataUrl: null,
    userPhone: null,
    lastActive: Date.now(),
    qrWaiters: []
  };
  sessions.set(userId, session);

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Prospecta SaaS', 'Chrome', '1.0.0']
    });

    session.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update: any) => {
      const current = sessions.get(userId);
      if (!current) return;

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        current.qr = qr;
        try {
          current.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
        } catch {
          current.qrDataUrl = null;
        }
        current.status = 'waiting_qr';
        current.lastActive = Date.now();

        const waiters = [...current.qrWaiters];
        current.qrWaiters = [];
        for (const resolve of waiters) {
          resolve({
            ok: true,
            status: 'waiting_qr',
            connected: false,
            qrDataUrl: current.qrDataUrl
          });
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        current.status = 'disconnected';
        current.qr = null;
        current.qrDataUrl = null;
        current.userPhone = null;

        if (!shouldReconnect) {
          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch {}
          sessions.delete(userId);
        }

        const waiters = [...current.qrWaiters];
        current.qrWaiters = [];
        for (const resolve of waiters) {
          resolve({
            ok: false,
            status: 'disconnected',
            connected: false,
            message: 'Conexão encerrada'
          });
        }
      } else if (connection === 'open') {
        current.status = 'connected';
        current.qr = null;
        current.qrDataUrl = null;
        current.userPhone = sock.user?.id ? sock.user.id.split(':')[0].replace(/\D/g, '') : 'Conectado';
        current.lastActive = Date.now();

        const waiters = [...current.qrWaiters];
        current.qrWaiters = [];
        for (const resolve of waiters) {
          resolve({
            ok: true,
            status: 'connected',
            connected: true,
            user: current.userPhone
          });
        }
      }
    });

    return session;
  } catch (err: any) {
    session.status = 'disconnected';
    const waiters = [...session.qrWaiters];
    session.qrWaiters = [];
    for (const resolve of waiters) {
      resolve({
        ok: false,
        status: 'disconnected',
        connected: false,
        message: err?.message || 'Falha ao inicializar WhatsApp'
      });
    }
    throw new AppError(err?.message || 'Falha ao inicializar o WhatsApp.', 500);
  }
}

/**
 * Returns QR Code data URL for the authenticated user, waiting for Baileys
 * connection.update event if a new QR needs to be generated.
 */
export async function getWhatsAppQr(userId: string, timeoutMs = 15000): Promise<{
  ok: boolean;
  connected?: boolean;
  status: string;
  user?: string | null;
  qrDataUrl?: string | null;
  message?: string;
}> {
  const session = sessions.get(userId);

  if (session && session.status === 'connected' && session.sock) {
    return {
      ok: true,
      connected: true,
      status: 'connected',
      user: session.userPhone
    };
  }

  if (session && session.status === 'waiting_qr' && session.qrDataUrl) {
    return {
      ok: true,
      connected: false,
      status: 'waiting_qr',
      qrDataUrl: session.qrDataUrl
    };
  }

  const activeSession = await initWhatsAppSession(userId);

  if (activeSession.status === 'connected') {
    return {
      ok: true,
      connected: true,
      status: 'connected',
      user: activeSession.userPhone
    };
  }

  if (activeSession.qrDataUrl) {
    return {
      ok: true,
      connected: false,
      status: 'waiting_qr',
      qrDataUrl: activeSession.qrDataUrl
    };
  }

  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        const idx = activeSession.qrWaiters.indexOf(handleResult);
        if (idx !== -1) activeSession.qrWaiters.splice(idx, 1);

        if (activeSession.qrDataUrl) {
          resolve({
            ok: true,
            connected: false,
            status: 'waiting_qr',
            qrDataUrl: activeSession.qrDataUrl
          });
        } else {
          resolve({
            ok: false,
            connected: false,
            status: activeSession.status || 'connecting',
            message: 'A inicializar WhatsApp. O QR Code será exibido em instantes.'
          });
        }
      }
    }, timeoutMs);

    const handleResult = (result: any) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(result);
      }
    };

    activeSession.qrWaiters.push(handleResult);
  });
}

/**
 * Returns the current WhatsApp connection status for the user.
 */
export async function getWhatsAppStatus(userId: string) {
  const sessionDir = getUserSessionDir(userId);
  const hasCreds = fs.existsSync(path.join(sessionDir, 'creds.json'));
  let session = sessions.get(userId);

  if (!session && hasCreds) {
    try {
      session = await initWhatsAppSession(userId);
    } catch {}
  }

  return {
    ok: true,
    connected: session?.status === 'connected',
    status: session?.status || (hasCreds ? 'connecting' : 'disconnected'),
    user: session?.userPhone || null,
    qrDataUrl: session?.qrDataUrl || null
  };
}

/**
 * Sends a WhatsApp message from the authenticated user's session.
 */
export async function sendWhatsAppMessage(userId: string, rawPhone: string, rawMessage: string) {
  const session = sessions.get(userId);
  if (!session || session.status !== 'connected' || !session.sock) {
    throw new AppError('WhatsApp não está conectado. Conecte o seu WhatsApp através do QR Code.', 400);
  }

  let phone = String(rawPhone || '').replace(/\D/g, '');
  const message = String(rawMessage || '').trim();

  if (phone.length === 9 && /^8[2-7]/.test(phone)) {
    phone = '258' + phone;
  }

  if (!phone || phone.length < 8) {
    throw new AppError('Número de telefone inválido.', 400);
  }

  if (!message) {
    throw new AppError('Mensagem não pode estar vazia.', 400);
  }

  const jid = `${phone}@s.whatsapp.net`;
  const result = await session.sock.sendMessage(jid, { text: message });

  return {
    ok: true,
    messageId: result?.key?.id || 'sent',
    to: jid,
    timestamp: Date.now()
  };
}

/**
 * Disconnects and destroys the WhatsApp session for the user.
 */
export async function disconnectWhatsApp(userId: string) {
  const session = sessions.get(userId);
  if (session?.sock) {
    try {
      await session.sock.logout().catch(() => {});
    } catch {}
    try {
      session.sock.end();
    } catch {}
  }

  sessions.delete(userId);

  const sessionDir = getUserSessionDir(userId);
  try {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  } catch {}

  return {
    ok: true,
    message: 'WhatsApp desconectado com sucesso.'
  };
}
