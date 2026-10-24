import { Router } from 'express';
import { waManager } from '../whatsapp.js';

export const sessionsRouter = Router();

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
    return res.json({
      ok: true,
      ...status,
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
 * Devolve o estado da conexão, o QR Code em DataURL (se pendente) e o número conectado.
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
    return res.json({
      ok: true,
      ...status,
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
