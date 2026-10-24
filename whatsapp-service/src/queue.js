import { db } from './db.js';
import { waManager } from './whatsapp.js';
import { normalizeMzPhone, toJid } from './normalizer.js';
import { renderMessage } from './spintax.js';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMaputoHour() {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Maputo',
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  } catch {
    const now = new Date();
    // UTC+2 para Moçambique
    return (now.getUTCHours() + 2) % 24;
  }
}

class CampaignWorker {
  constructor(campaignId) {
    this.campaignId = campaignId;
    this.cancelled = false;
    this.paused = false;
    this.isRunning = false;
  }
}

const activeWorkers = new Map();

export const queueManager = {
  getWorker(campaignId) {
    return activeWorkers.get(campaignId) || null;
  },

  async startCampaign(campaignId) {
    let worker = activeWorkers.get(campaignId);
    if (worker && worker.isRunning) {
      console.log(`[Queue] Campanha ${campaignId} já está em execução.`);
      return;
    }

    worker = new CampaignWorker(campaignId);
    activeWorkers.set(campaignId, worker);

    await db.updateCampaignStatus(campaignId, 'running');
    this.runWorker(worker).catch((err) => {
      console.error(`[Queue] Erro fatal no worker da campanha ${campaignId}:`, err);
    });
  },

  async pauseCampaign(campaignId) {
    const worker = activeWorkers.get(campaignId);
    if (worker) {
      worker.paused = true;
    }
    await db.updateCampaignStatus(campaignId, 'paused');
    console.log(`[Queue] Campanha ${campaignId} pausada pelo utilizador.`);
  },

  async resumeCampaign(campaignId) {
    await this.startCampaign(campaignId);
    console.log(`[Queue] Campanha ${campaignId} retomada pelo utilizador.`);
  },

  async cancelCampaign(campaignId) {
    const worker = activeWorkers.get(campaignId);
    if (worker) {
      worker.cancelled = true;
    }
    await db.updateCampaignStatus(campaignId, 'cancelled');
    activeWorkers.delete(campaignId);
    console.log(`[Queue] Campanha ${campaignId} cancelada.`);
  },

  async runWorker(worker) {
    worker.isRunning = true;
    const { campaignId } = worker;

    const campaign = await db.getCampaign(campaignId);
    if (!campaign) {
      console.error(`[Queue] Campanha ${campaignId} não encontrada na base de dados.`);
      worker.isRunning = false;
      return;
    }

    const { user_id: userId, message_template: template, settings } = campaign;
    const stats = campaign.stats || { total: 0, sent: 0, failed: 0, ignored: 0, optout: 0 };

    const minDelay = Math.max(10, settings?.minDelaySec || 20);
    const maxDelay = Math.max(minDelay, settings?.maxDelaySec || 60);
    const dailyLimit = settings?.dailyLimit || 40;
    const startHour = settings?.startHour ?? 8;
    const endHour = settings?.endHour ?? 19;
    const pauseEvery = settings?.pauseEvery || 20;
    const pauseDurationMs = (settings?.pauseDurationMinutes || 7) * 60 * 1000;

    let consecutiveErrors = 0;
    let messagesSentThisRun = 0;
    const processedPhones = new Set();

    console.log(`[Queue] Iniciando envio da campanha "${campaign.name}" (${campaignId}) para utilizador ${userId}`);

    while (!worker.cancelled && !worker.paused) {
      // 1. Verificar se a sessão do WhatsApp está conectada
      const session = waManager.getSession(userId);
      if (!session || session.state !== 'connected' || !session.sock) {
        console.warn(`[Queue] WhatsApp do utilizador ${userId} não está conectado. Aguardando 15s...`);
        for (let i = 0; i < 15; i++) {
          if (worker.cancelled || worker.paused) break;
          await sleep(1000);
        }
        continue;
      }

      // 2. Janela de envio (08:00 às 19:00 fuso de Moçambique)
      const currentHour = getMaputoHour();
      if (currentHour < startHour || currentHour >= endHour) {
        console.log(`[Queue] Fora da janela de envio (${currentHour}:00 em Moçambique). Aguardando horário comercial (${startHour}h-${endHour}h)...`);
        for (let i = 0; i < 60; i++) {
          if (worker.cancelled || worker.paused) break;
          await sleep(1000);
        }
        continue;
      }

      // 3. Limite diário por número
      const sentToday = await db.getSentCountToday(userId);
      if (sentToday >= dailyLimit) {
        console.warn(`[Queue] Limite diário de ${dailyLimit} envios atingido para o utilizador ${userId}. Campanha em pausa de segurança.`);
        await db.updateCampaignStatus(
          campaignId,
          'paused',
          stats,
          `Limite diário atingido (${sentToday}/${dailyLimit}). A campanha continuará amanhã para proteger o seu número contra bloqueios.`
        );
        break;
      }

      // 4. Buscar próximo destinatário pendente
      const recipient = await db.getNextPendingRecipient(campaignId);
      if (!recipient) {
        console.log(`[Queue] Todos os destinatários da campanha ${campaignId} foram processados. Campanha concluída com sucesso!`);
        await db.updateCampaignStatus(campaignId, 'completed', stats);
        break;
      }

      // 5. Normalizar número moçambicano
      const cleanPhone = normalizeMzPhone(recipient.phone);
      if (!cleanPhone) {
        console.log(`[Queue] Número inválido ignorado: ${recipient.phone}`);
        await db.updateRecipientStatus(recipient.id, 'ignored', 'Número de telefone inválido para Moçambique');
        stats.ignored++;
        await db.updateCampaignStatus(campaignId, 'running', stats);
        continue;
      }

      // 6. Deduplicação dentro da campanha
      if (processedPhones.has(cleanPhone)) {
        console.log(`[Queue] Número duplicado na mesma campanha ignorado: +${cleanPhone}`);
        await db.updateRecipientStatus(recipient.id, 'ignored', 'Número duplicado nesta campanha');
        stats.ignored++;
        await db.updateCampaignStatus(campaignId, 'running', stats);
        continue;
      }
      processedPhones.add(cleanPhone);

      // 7. Verificar lista de exclusão (Opt-Out)
      const isOut = await db.isOptedOut(userId, cleanPhone);
      if (isOut) {
        console.log(`[Queue] Destinatário +${cleanPhone} solicitou saída (opt-out). Ignorado.`);
        await db.updateRecipientStatus(recipient.id, 'optout', 'Contacto solicitou exclusão (SAIR)');
        stats.optout++;
        await db.updateCampaignStatus(campaignId, 'running', stats);
        continue;
      }

      const jid = toJid(cleanPhone);

      // 8. Verificar existência no WhatsApp com sock.onWhatsApp()
      let existsOnWa = false;
      try {
        const [onWaResult] = await session.sock.onWhatsApp(jid);
        existsOnWa = !!onWaResult?.exists;
      } catch (e) {
        // Se a chamada de validação falhar temporariamente, permite a tentativa de envio
        existsOnWa = true;
      }

      if (!existsOnWa) {
        console.log(`[Queue] Número +${cleanPhone} não possui WhatsApp. Marcado como ignorado.`);
        await db.updateRecipientStatus(recipient.id, 'ignored', 'Número não registado no WhatsApp');
        stats.ignored++;
        await db.updateCampaignStatus(campaignId, 'running', stats);
        continue;
      }

      // 9. Interpolar mensagem com variáveis e aplicar spintax
      const messageText = renderMessage(template, recipient.vars);

      // 10. Simulação de digitação (2 a 5 segundos)
      const typingMs = getRandomInt(2000, 5000);
      try {
        await session.sock.sendPresenceUpdate('composing', jid);
        await sleep(typingMs);
        await session.sock.sendPresenceUpdate('paused', jid);
      } catch {}

      // 11. Envio da mensagem
      try {
        await session.sock.sendMessage(jid, { text: messageText });
        console.log(`[Queue] Mensagem entregue com sucesso a +${cleanPhone} (${stats.sent + 1}/${stats.total})`);

        await db.updateRecipientStatus(recipient.id, 'sent', null, Date.now());
        stats.sent++;
        consecutiveErrors = 0;
        messagesSentThisRun++;
      } catch (sendErr) {
        console.error(`[Queue] Falha no envio para +${cleanPhone}:`, sendErr.message);
        await db.updateRecipientStatus(recipient.id, 'failed', sendErr.message);
        stats.failed++;
        consecutiveErrors++;

        // Proteção anti-bloqueio: parar se houver 5 falhas seguidas
        if (consecutiveErrors >= 5) {
          const errMsg = 'Campanha interrompida preventivamente: 5 falhas consecutivas de envio. Verifique o seu WhatsApp.';
          console.error(`[Queue] ${errMsg}`);
          await db.updateCampaignStatus(campaignId, 'failed', stats, errMsg);
          break;
        }
      }

      // Atualizar contadores da campanha no banco
      await db.updateCampaignStatus(campaignId, 'running', stats);

      // 12. Pausa prolongada a cada bloco (ex: a cada 20 mensagens, pausa 7 minutos)
      if (messagesSentThisRun > 0 && messagesSentThisRun % pauseEvery === 0) {
        const pauseMinutes = Math.round(pauseDurationMs / 60000);
        console.log(`[Queue] Bloco de ${pauseEvery} envios concluído. Pausa anti-bloqueio de ${pauseMinutes} minutos iniciada...`);
        const pauseSeconds = Math.round(pauseDurationMs / 1000);

        for (let s = 0; s < pauseSeconds; s++) {
          if (worker.cancelled || worker.paused) break;
          await sleep(1000);
        }
        console.log('[Queue] Pausa de segurança concluída. Retomando envios...');
      } else {
        // 13. Atraso aleatório entre envios normais (20 a 60 segundos)
        const delaySec = getRandomInt(minDelay, maxDelay);
        console.log(`[Queue] Aguardando intervalo de segurança: ${delaySec} segundos até o próximo envio...`);

        for (let s = 0; s < delaySec; s++) {
          if (worker.cancelled || worker.paused) break;
          await sleep(1000);
        }
      }
    }

    worker.isRunning = false;
    activeWorkers.delete(campaignId);
  },

  async restoreActiveCampaigns() {
    console.log('[Queue] A verificar campanhas interrompidas na base de dados para retomar...');
    const active = await db.listActiveCampaigns();
    console.log(`[Queue] Encontradas ${active.length} campanhas pendentes/ativas.`);

    for (const c of active) {
      console.log(`[Queue] A retomar campanha "${c.name}" (${c.id})...`);
      this.startCampaign(c.id).catch((err) => {
        console.error(`[Queue] Erro ao retomar campanha ${c.id}:`, err.message);
      });
    }
  },
};
