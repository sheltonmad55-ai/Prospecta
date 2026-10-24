import { Router } from 'express';
import { waManager } from '../whatsapp.js';
import { db } from '../db.js';

export const sessionsRouter = Router();

// Requisito 2: Isolamento estrito entre utilizadores
sessionsRouter.use('/:userId', (req, res, next) => {
  const headerUserId = req.headers['x-user-id'];
  if (headerUserId && headerUserId !== req.params.userId) {
    return res.status(403).json({
      ok: false,
      error: 'Acesso negado: utilizador não autorizado para aceder a esta sessão de WhatsApp.',
    });
  }
  next();
});

/**
 * POST /sessions/:userId/connect
 * Inicia ou retoma a conexão do WhatsApp para o utilizador especificado.
 */
sessionsRouter.post('/:userId/connect', async (req, res) => {
  const { userId } = req.params;
  const { force } = req.body || {};

  try {
    const session = await waManager.connectSession(userId, !!force);
    const status = session.getStatus();
    const warmup = await db.getWarmupInfo(userId).catch(() => null);
    return res.json({
      ok: true,
      ...status,
      warmup,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      state: 'disconnected',
      error: err.message || 'Falha ao inicializar conexão do WhatsApp.',
    });
  }
});

/**
 * GET /sessions/:userId/status
 * Devolve o estado da conexão, o QR Code em DataURL (se pendente), o número conectado e métricas de aquecimento.
 */
sessionsRouter.get('/:userId/status', async (req, res) => {
  const { userId } = req.params;

  try {
    let session = waManager.getSession(userId);

    // Se ainda não existir em memória, tenta inicializar automaticamente
    if (!session) {
      session = await waManager.connectSession(userId, false);
    }

    const status = session.getStatus();
    const warmup = await db.getWarmupInfo(userId).catch(() => null);
    return res.json({
      ok: true,
      ...status,
      warmup,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      state: 'disconnected',
      error: err.message || 'Falha ao verificar estado da sessão.',
    });
  }
});

/**
 * POST /sessions/:userId/logout
 * Desconecta o WhatsApp e apaga todas as credenciais gravadas na base de dados.
 */
sessionsRouter.post('/:userId/logout', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await waManager.logoutSession(userId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Falha ao desconectar o WhatsApp.',
    });
  }
});

/**
 * POST /sessions/:userId/send
 * Envia uma mensagem de teste individual
 */
sessionsRouter.post('/:userId/send', async (req, res) => {
  const { userId } = req.params;
  const { phone, message } = req.body || {};

  if (!phone || !message) {
    return res.status(400).json({
      ok: false,
      error: 'Telefone ("phone") e mensagem ("message") são obrigatórios.',
    });
  }

  try {
    const result = await waManager.sendMessage(userId, phone, message);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({
      ok: false,
      error: err.message || 'Falha no envio da mensagem.',
    });
  }
});
