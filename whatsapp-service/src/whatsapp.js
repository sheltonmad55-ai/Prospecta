import makeWASocketDefault, * as baileysExports from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import { useDbAuthState } from './auth-state.js';
import { db } from './db.js';
import { normalizeMzPhone, toJid } from './normalizer.js';

const makeWASocket = makeWASocketDefault?.default || makeWASocketDefault || baileysExports.default || baileysExports.makeWASocket;
const DisconnectReason = baileysExports.DisconnectReason || {
  loggedOut: 401,
  connectionClosed: 428,
  connectionLost: 408,
  timedOut: 408,
  restartRequired: 515,
};

// Mapa em memória de sessões por utilizador: userId -> SessionObject
const sessions = new Map();

export class UserSession {
  constructor(userId) {
    this.userId = userId;
    this.sock = null;
    this.state = 'disconnected'; // 'disconnected' | 'connecting' | 'qr' | 'connected'
    this.qr = null;
    this.qrDataUrl = null;
    this.phone = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.qrExpiresAt = null;
    this.clearState = null;
  }

  getStatus() {
    return {
      state: this.state,
      qr: this.state === 'qr' ? this.qrDataUrl : null,
      phone: this.phone,
      userId: this.userId,
    };
  }
}

export const waManager = {
  getSession(userId) {
    return sessions.get(userId) || null;
  },

  getAllSessions() {
    return Array.from(sessions.values());
  },

  /**
   * Conecta ou recupera a sessão do utilizador
   */
  async connectSession(userId, forceNew = false) {
    let session = sessions.get(userId);

    if (session && !forceNew) {
      if (session.state === 'connected') {
        return session;
      }
      if (session.state === 'qr' && session.qrDataUrl) {
        // Se o QR ainda for recente (menos de 45 segundos), reutiliza
        if (session.qrExpiresAt && Date.now() < session.qrExpiresAt) {
          return session;
        }
      }
    }

    if (!session) {
      session = new UserSession(userId);
      sessions.set(userId, session);
    }

    // Se já havia um socket aberto, encerra-o antes de recriar
    if (session.sock) {
      try {
        session.sock.ev.removeAllListeners('connection.update');
        session.sock.ev.removeAllListeners('creds.update');
        session.sock.ev.removeAllListeners('messages.upsert');
        session.sock.end();
      } catch {}
      session.sock = null;
    }

    session.state = 'connecting';
    session.qr = null;
    session.qrDataUrl = null;

    try {
      const { state, saveCreds, clearState } = await useDbAuthState(userId);
      session.clearState = clearState;

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }), // Nunca expõe credenciais ou chaves em logs
        browser: ['Prospecta SaaS', 'Chrome', '124.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        emitOwnEvents: false,
      });

      session.sock = sock;

      // 1. Gravar credenciais atualizadas na base de dados
      sock.ev.on('creds.update', saveCreds);

      // 2. Atualizações de estado de conexão e QR Code
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          session.qr = qr;
          try {
            session.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
          } catch (e) {
            console.error('[WA] Falha ao gerar DataURL do QR:', e.message);
            session.qrDataUrl = null;
          }
          session.state = 'qr';
          session.qrExpiresAt = Date.now() + 50000; // QR do WhatsApp dura cerca de 60s
          console.log(`[WA] Novo QR Code gerado para o utilizador ${userId}`);
        }

        if (connection === 'open') {
          session.state = 'connected';
          session.qr = null;
          session.qrDataUrl = null;
          session.reconnectAttempts = 0;
          if (session.reconnectTimer) {
            clearTimeout(session.reconnectTimer);
            session.reconnectTimer = null;
          }

          const rawPhone = sock.user?.id ? sock.user.id.split(':')[0].replace(/\D/g, '') : null;
          session.phone = rawPhone ? normalizeMzPhone(rawPhone) || rawPhone : 'Conectado';
          console.log(`[WA] Sessão conectada com sucesso para utilizador ${userId} (+${session.phone})`);
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

          console.log(`[WA] Conexão encerrada para utilizador ${userId}. Código: ${statusCode}, LoggedOut: ${isLoggedOut}`);

          session.state = 'disconnected';
          session.qr = null;
          session.qrDataUrl = null;

          if (isLoggedOut) {
            console.log(`[WA] Sessão desconectada pelo utilizador ${userId}. Limpando credenciais da base de dados.`);
            if (session.clearState) {
              await session.clearState().catch(() => {});
            }
            sessions.delete(userId);
          } else {
            // Reconexão com backoff exponencial: 2s, 4s, 8s, 16s... até 30s
            session.reconnectAttempts++;
            const backoffMs = Math.min(30000, Math.pow(2, Math.min(session.reconnectAttempts, 5)) * 1000);
            console.log(`[WA] A reconectar utilizador ${userId} em ${backoffMs / 1000}s (Tentativa ${session.reconnectAttempts})...`);

            if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
            session.reconnectTimer = setTimeout(() => {
              waManager.connectSession(userId).catch((err) => {
                console.error(`[WA] Falha ao reconectar utilizador ${userId}:`, err.message);
              });
            }, backoffMs);
          }
        }
      });

      // 3. Ouvinte de mensagens recebidas (Anti-Spam / Opt-Out "SAIR" / "PARAR")
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (!messages || messages.length === 0) return;

        for (const msg of messages) {
          if (msg.key?.fromMe) continue; // Ignora mensagens enviadas pelo próprio utilizador

          const senderJid = msg.key?.remoteJid || '';
          if (!senderJid.endsWith('@s.whatsapp.net')) continue; // Apenas conversas diretas, ignora grupos

          const text = (
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            ''
          ).trim();

          const upper = text.toUpperCase();
          if (upper === 'SAIR' || upper === 'PARAR' || upper === 'STOP' || upper === 'CANCELAR') {
            const phoneDigits = senderJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
            const cleanPhone = normalizeMzPhone(phoneDigits) || phoneDigits;

            console.log(`[WA Opt-Out] Utilizador ${userId} recebeu pedido de saída de +${cleanPhone}: "${text}"`);
            await db.addOptOut(userId, cleanPhone, upper);

            try {
              // Confirmação cordial automática de saída
              await sock.sendMessage(senderJid, {
                text: 'O seu número foi removido com sucesso da nossa lista de contactos. Não receberá mais mensagens automáticas. Obrigado!',
              });
            } catch {}
          }
        }
      });

      return session;
    } catch (err) {
      session.state = 'disconnected';
      console.error(`[WA] Erro ao inicializar sessão para utilizador ${userId}:`, err.message);
      throw err;
    }
  },

  /**
   * Envia uma mensagem individual (teste ou pontual) com normalização moçambicana e validação
   */
  async sendMessage(userId, rawPhone, message) {
    const session = sessions.get(userId);
    if (!session || session.state !== 'connected' || !session.sock) {
      throw new Error('WhatsApp não está conectado. Conecte primeiro através do QR Code.');
    }

    const cleanPhone = normalizeMzPhone(rawPhone);
    if (!cleanPhone) {
      throw new Error(`Número de telefone inválido: "${rawPhone}". Use o formato moçambicano (ex: 847404158 ou +258...).`);
    }

    // Verificar lista de opt-out
    const isOut = await db.isOptedOut(userId, cleanPhone);
    if (isOut) {
      throw new Error(`O número +${cleanPhone} solicitou saída (opt-out) e não pode receber mensagens.`);
    }

    const jid = toJid(cleanPhone);

    // Validação de existência no WhatsApp
    try {
      const [result] = await session.sock.onWhatsApp(jid);
      if (!result?.exists) {
        throw new Error(`O número +${cleanPhone} não possui uma conta WhatsApp ativa.`);
      }
    } catch (checkErr) {
      console.warn(`[WA] Falha ao verificar existência de ${jid} (tentando envio direto):`, checkErr.message);
    }

    // Simula presença de escrita por 2 segundos para humanizar
    try {
      await session.sock.sendPresenceUpdate('composing', jid);
      await new Promise((r) => setTimeout(r, 2000));
      await session.sock.sendPresenceUpdate('paused', jid);
    } catch {}

    const sent = await session.sock.sendMessage(jid, { text: message.trim() });

    return {
      ok: true,
      messageId: sent?.key?.id || 'sent',
      to: cleanPhone,
      timestamp: Date.now(),
    };
  },

  /**
   * Termina sessão, desconecta o socket e apaga credenciais do banco
   */
  async logoutSession(userId) {
    const session = sessions.get(userId);
    if (session) {
      if (session.reconnectTimer) {
        clearTimeout(session.reconnectTimer);
        session.reconnectTimer = null;
      }
      if (session.sock) {
        try {
          await session.sock.logout().catch(() => {});
        } catch {}
        try {
          session.sock.end();
        } catch {}
      }
      sessions.delete(userId);
    }

    await db.clearUserAuth(userId);
    console.log(`[WA] Sessão do utilizador ${userId} terminada e credenciais limpas com sucesso.`);
    return { ok: true, message: 'WhatsApp desconectado com sucesso.' };
  },

  /**
   * Restaura todas as sessões existentes no arranque do microserviço
   */
  async restoreAllSessions() {
    console.log('[WA] A verificar sessões ativas na base de dados para restauração automática...');
    const userIds = await db.listUsersWithAuth();
    console.log(`[WA] Encontradas ${userIds.length} sessões gravadas.`);

    for (const userId of userIds) {
      try {
        console.log(`[WA] A restaurar sessão do utilizador ${userId}...`);
        await waManager.connectSession(userId);
      } catch (err) {
        console.error(`[WA] Falha ao restaurar sessão do utilizador ${userId}:`, err.message);
      }
    }
  },
};
