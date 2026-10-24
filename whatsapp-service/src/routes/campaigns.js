import { Router } from 'express';
import { db } from '../db.js';
import { queueManager } from '../queue.js';

export const campaignsRouter = Router();

/**
 * POST /campaigns
 * Cria uma nova campanha com destinatários e inicia o disparo na fila segura
 */
campaignsRouter.post('/', async (req, res) => {
  const { userId, name, messageTemplate, recipients, settings } = req.body || {};

  if (!userId) {
    return res.status(400).json({ ok: false, error: 'O "userId" é obrigatório.' });
  }

  if (!name || !messageTemplate) {
    return res.status(400).json({ ok: false, error: 'Nome da campanha e template da mensagem são obrigatórios.' });
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ ok: false, error: 'Lista de destinatários vazia.' });
  }

  try {
    const campaign = await db.createCampaign({
      userId,
      name,
      messageTemplate,
      settings,
      recipients,
    });

    // Inicia imediatamente o processamento na fila
    queueManager.startCampaign(campaign.id).catch(() => {});

    return res.status(201).json({
      ok: true,
      campaign,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Falha ao criar campanha.',
    });
  }
});

/**
 * GET /campaigns/:id
 * Consulta o progresso detalhado de uma campanha
 */
campaignsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const campaign = await db.getCampaign(id);
    if (!campaign) {
      return res.status(404).json({ ok: false, error: 'Campanha não encontrada.' });
    }

    const recipients = await db.getCampaignRecipients(id);
    const worker = queueManager.getWorker(id);

    return res.json({
      ok: true,
      campaign: {
        ...campaign,
        isWorkerActive: !!worker?.isRunning,
      },
      recipients,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Falha ao consultar campanha.',
    });
  }
});

/**
 * POST /campaigns/:id/pause
 */
campaignsRouter.post('/:id/pause', async (req, res) => {
  const { id } = req.params;

  try {
    await queueManager.pauseCampaign(id);
    return res.json({ ok: true, message: 'Campanha pausada com sucesso.' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Falha ao pausar campanha.' });
  }
});

/**
 * POST /campaigns/:id/resume
 */
campaignsRouter.post('/:id/resume', async (req, res) => {
  const { id } = req.params;

  try {
    await queueManager.resumeCampaign(id);
    return res.json({ ok: true, message: 'Campanha retomada com sucesso.' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Falha ao retomar campanha.' });
  }
});

/**
 * POST /campaigns/:id/cancel
 */
campaignsRouter.post('/:id/cancel', async (req, res) => {
  const { id } = req.params;

  try {
    await queueManager.cancelCampaign(id);
    return res.json({ ok: true, message: 'Campanha cancelada com sucesso.' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Falha ao cancelar campanha.' });
  }
});
