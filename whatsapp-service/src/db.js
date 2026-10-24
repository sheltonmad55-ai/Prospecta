import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

let supabase = null;

if (config.supabaseUrl && config.supabaseKey) {
  supabase = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  console.log('[DB] Conectado ao Supabase:', config.supabaseUrl);
} else {
  console.warn('[DB] AVISO: SUPABASE_URL e SUPABASE_SERVICE_KEY não configurados. Usando armazenamento em memória para testes.');
}

// Armazenamento em memória (fallback para testes locais)
const memStore = {
  wa_auth: new Map(), // key: `${userId}:${key}`, val: string
  wa_optout: new Map(), // key: `${userId}:${phone}`, val: object
  wa_campaigns: new Map(), // key: id, val: object
  wa_campaign_recipients: new Map(), // key: id, val: object
};

export const db = {
  isSupabaseConnected() {
    return !!supabase;
  },

  // ----------------------------------------------------
  // WA_AUTH (Baileys Credenciais e Chaves de Sessão)
  // ----------------------------------------------------
  async getAuthKey(userId, key) {
    if (supabase) {
      const { data, error } = await supabase
        .from('wa_auth')
        .select('value')
        .eq('user_id', userId)
        .eq('key', key)
        .maybeSingle();

      if (error) {
        console.error('[DB wa_auth] Erro ao ler chave:', key, error.message);
        return null;
      }
      return data?.value || null;
    }

    return memStore.wa_auth.get(`${userId}:${key}`) || null;
  },

  async getAuthKeys(userId, keys) {
    if (!keys || keys.length === 0) return {};

    if (supabase) {
      const { data, error } = await supabase
        .from('wa_auth')
        .select('key, value')
        .eq('user_id', userId)
        .in('key', keys);

      if (error) {
        console.error('[DB wa_auth] Erro ao ler lote de chaves:', error.message);
        return {};
      }

      const map = {};
      for (const row of data || []) {
        map[row.key] = row.value;
      }
      return map;
    }

    const map = {};
    for (const key of keys) {
      const val = memStore.wa_auth.get(`${userId}:${key}`);
      if (val !== undefined && val !== null) {
        map[key] = val;
      }
    }
    return map;
  },

  async setAuthKey(userId, key, value) {
    if (supabase) {
      const { error } = await supabase
        .from('wa_auth')
        .upsert(
          {
            user_id: userId,
            key,
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,key' }
        );

      if (error) {
        console.error('[DB wa_auth] Erro ao gravar chave:', key, error.message);
      }
      return;
    }

    memStore.wa_auth.set(`${userId}:${key}`, value);
  },

  async setAuthKeys(userId, entries) {
    if (!entries || entries.length === 0) return;

    if (supabase) {
      const rows = entries.map((e) => ({
        user_id: userId,
        key: e.key,
        value: e.value,
        updated_at: new Date().toISOString(),
      }));

      // Inserção em lotes de 100 para evitar payload excessivo
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('wa_auth')
          .upsert(chunk, { onConflict: 'user_id,key' });

        if (error) {
          console.error('[DB wa_auth] Erro ao gravar lote de chaves:', error.message);
        }
      }
      return;
    }

    for (const e of entries) {
      memStore.wa_auth.set(`${userId}:${e.key}`, e.value);
    }
  },

  async deleteAuthKey(userId, key) {
    if (supabase) {
      const { error } = await supabase
        .from('wa_auth')
        .delete()
        .eq('user_id', userId)
        .eq('key', key);

      if (error) {
        console.error('[DB wa_auth] Erro ao remover chave:', key, error.message);
      }
      return;
    }

    memStore.wa_auth.delete(`${userId}:${key}`);
  },

  async deleteAuthKeys(userId, keys) {
    if (!keys || keys.length === 0) return;

    if (supabase) {
      const { error } = await supabase
        .from('wa_auth')
        .delete()
        .eq('user_id', userId)
        .in('key', keys);

      if (error) {
        console.error('[DB wa_auth] Erro ao remover lote de chaves:', error.message);
      }
      return;
    }

    for (const key of keys) {
      memStore.wa_auth.delete(`${userId}:${key}`);
    }
  },

  async clearUserAuth(userId) {
    if (supabase) {
      const { error } = await supabase
        .from('wa_auth')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('[DB wa_auth] Erro ao limpar sessão do utilizador:', userId, error.message);
      }
      return;
    }

    for (const key of memStore.wa_auth.keys()) {
      if (key.startsWith(`${userId}:`)) {
        memStore.wa_auth.delete(key);
      }
    }
  },

  async listUsersWithAuth() {
    if (supabase) {
      const { data, error } = await supabase
        .from('wa_auth')
        .select('user_id')
        .eq('key', 'creds');

      if (error) {
        console.error('[DB wa_auth] Erro ao listar sessões activas:', error.message);
        return [];
      }

      return (data || []).map((r) => r.user_id);
    }

    const users = new Set();
    for (const key of memStore.wa_auth.keys()) {
      if (key.endsWith(':creds')) {
        const uid = key.replace(/:creds$/, '');
        users.add(uid);
      }
    }
    return Array.from(users);
  },

  // ----------------------------------------------------
  // AQUECIMENTO AUTOMÁTICO DO NÚMERO (WARMUP)
  // ----------------------------------------------------
  async getConnectedAt(userId) {
    return await this.getAuthKey(userId, 'meta:connected_at');
  },

  async setConnectedAt(userId, timestamp = new Date().toISOString()) {
    const existing = await this.getConnectedAt(userId);
    if (!existing) {
      await this.setAuthKey(userId, 'meta:connected_at', timestamp);
      return timestamp;
    }
    return existing;
  },

  async getWarmupInfo(userId, customLimit = 40) {
    let connectedAt = await this.getConnectedAt(userId);
    if (!connectedAt) {
      // Se tiver credenciais ativas, inicializa a data de conexão
      const creds = await this.getAuthKey(userId, 'creds');
      if (creds) {
        connectedAt = await this.setConnectedAt(userId);
      }
    }

    const now = new Date();
    const connDate = connectedAt ? new Date(connectedAt) : now;
    const diffMs = Math.max(0, now.getTime() - connDate.getTime());
    const dayNumber = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);

    let maxRecommended = 15;
    let phase = 'Fase 1: Dias 1 a 3';
    let phaseDescription = 'Início seguro com volume reduzido para construir histórico na Meta';
    if (dayNumber >= 8) {
      maxRecommended = Math.max(40, customLimit || 40);
      phase = 'Fase 3: Dia 8 em diante';
      phaseDescription = 'Aquecimento concluído! Limite padrão de 40 envios diários';
    } else if (dayNumber >= 4) {
      maxRecommended = 30;
      phase = 'Fase 2: Dias 4 a 7';
      phaseDescription = 'Aumento gradual e seguro da cadência diária';
    }

    const todaySent = await this.getSentCountToday(userId);
    const effectiveLimit = Math.min(maxRecommended, customLimit || maxRecommended);
    const remainingToday = Math.max(0, effectiveLimit - todaySent);

    return {
      dayNumber,
      phase,
      phaseDescription,
      recommendedLimit: maxRecommended,
      effectiveLimit,
      todaySent,
      remainingToday,
      connectedAt: connectedAt || now.toISOString(),
      isOverWarmupRecommended: (customLimit || 0) > maxRecommended,
    };
  },

  // ----------------------------------------------------
  // WA_OPTOUT (Lista de Exclusão "SAIR" / "PARAR")
  // ----------------------------------------------------
  async addOptOut(userId, phone, reason = 'SAIR') {
    if (supabase) {
      const { error } = await supabase.from('wa_optout').upsert(
        {
          user_id: userId,
          phone,
          reason,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,phone' }
      );
      if (error) {
        console.error('[DB wa_optout] Erro ao registar opt-out:', error.message);
      }
      return;
    }

    memStore.wa_optout.set(`${userId}:${phone}`, { userId, phone, reason, createdAt: new Date() });
  },

  async isOptedOut(userId, phone) {
    if (supabase) {
      const { data } = await supabase
        .from('wa_optout')
        .select('id')
        .eq('user_id', userId)
        .eq('phone', phone)
        .maybeSingle();

      return !!data;
    }

    return memStore.wa_optout.has(`${userId}:${phone}`);
  },

  // ----------------------------------------------------
  // WA_CAMPAIGNS (Gestão de Campanhas)
  // ----------------------------------------------------
  async createCampaign({ userId, name, messageTemplate, settings, recipients }) {
    const defaultSettings = {
      minDelaySec: 20,
      maxDelaySec: 60,
      dailyLimit: 40,
      startHour: 8,
      endHour: 19,
      pauseEvery: 20,
      pauseDurationMinutes: 7,
      ...(settings || {}),
    };

    const stats = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      ignored: 0,
      optout: 0,
    };

    if (supabase) {
      // 1. Criar campanha
      const { data: campaign, error: campErr } = await supabase
        .from('wa_campaigns')
        .insert({
          user_id: userId,
          name,
          message_template: messageTemplate,
          settings: defaultSettings,
          status: 'pending',
          stats,
        })
        .select()
        .single();

      if (campErr) {
        throw new Error(`Falha ao criar campanha: ${campErr.message}`);
      }

      // 2. Inserir destinatários em lote
      const rows = recipients.map((r) => ({
        campaign_id: campaign.id,
        user_id: userId,
        phone: r.phone,
        vars: r.vars || {},
        status: 'pending',
      }));

      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error: recipErr } = await supabase.from('wa_campaign_recipients').insert(chunk);
        if (recipErr) {
          console.error('[DB wa_campaign_recipients] Erro ao inserir destinatários:', recipErr.message);
        }
      }

      return campaign;
    }

    // Memória
    const id = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const campaign = {
      id,
      user_id: userId,
      name,
      message_template: messageTemplate,
      settings: defaultSettings,
      status: 'pending',
      stats,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memStore.wa_campaigns.set(id, campaign);

    recipients.forEach((r, idx) => {
      const recId = `rec_${id}_${idx}`;
      memStore.wa_campaign_recipients.set(recId, {
        id: recId,
        campaign_id: id,
        user_id: userId,
        phone: r.phone,
        vars: r.vars || {},
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    });

    return campaign;
  },

  async getCampaign(id) {
    if (supabase) {
      const { data, error } = await supabase
        .from('wa_campaigns')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[DB wa_campaigns] Erro ao obter campanha:', error.message);
        return null;
      }
      return data;
    }

    return memStore.wa_campaigns.get(id) || null;
  },

  async updateCampaignStatus(id, status, stats = null, lastError = null) {
    const update = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (stats) update.stats = stats;
    if (lastError !== null) update.last_error = lastError;

    if (supabase) {
      await supabase.from('wa_campaigns').update(update).eq('id', id);
      return;
    }

    const c = memStore.wa_campaigns.get(id);
    if (c) {
      Object.assign(c, update);
    }
  },

  async listActiveCampaigns() {
    if (supabase) {
      const { data, error } = await supabase
        .from('wa_campaigns')
        .select('*')
        .in('status', ['running', 'pending']);

      if (error) {
        console.error('[DB wa_campaigns] Erro ao listar campanhas activas:', error.message);
        return [];
      }
      return data || [];
    }

    const active = [];
    for (const c of memStore.wa_campaigns.values()) {
      if (c.status === 'running' || c.status === 'pending') {
        active.push(c);
      }
    }
    return active;
  },

  // ----------------------------------------------------
  // WA_CAMPAIGN_RECIPIENTS (Fila de Envios)
  // ----------------------------------------------------
  async getNextPendingRecipient(campaignId) {
    if (supabase) {
      const { data, error } = await supabase
        .from('wa_campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[DB wa_campaign_recipients] Erro ao buscar próximo destinatário:', error.message);
        return null;
      }
      return data;
    }

    for (const r of memStore.wa_campaign_recipients.values()) {
      if (r.campaign_id === campaignId && r.status === 'pending') {
        return r;
      }
    }
    return null;
  },

  async updateRecipientStatus(id, status, error = null, sentAt = null) {
    const update = {
      status,
      error: error || null,
      sent_at: sentAt ? new Date(sentAt).toISOString() : (status === 'sent' ? new Date().toISOString() : null),
    };

    if (supabase) {
      await supabase.from('wa_campaign_recipients').update(update).eq('id', id);
      return;
    }

    const r = memStore.wa_campaign_recipients.get(id);
    if (r) {
      Object.assign(r, update);
    }
  },

  async getCampaignRecipients(campaignId) {
    if (supabase) {
      const { data, error } = await supabase
        .from('wa_campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[DB wa_campaign_recipients] Erro ao buscar destinatários:', error.message);
        return [];
      }
      return data || [];
    }

    const res = [];
    for (const r of memStore.wa_campaign_recipients.values()) {
      if (r.campaign_id === campaignId) {
        res.push(r);
      }
    }
    return res;
  },

  async getSentCountToday(userId) {
    // Calcula o início do dia no fuso de Maputo (UTC+2)
    const now = new Date();
    const maputoOffsetHours = 2;
    const utcDate = new Date(now.getTime() + maputoOffsetHours * 3600 * 1000);
    utcDate.setUTCHours(0, 0, 0, 0);
    const startOfDayISO = new Date(utcDate.getTime() - maputoOffsetHours * 3600 * 1000).toISOString();

    if (supabase) {
      const { count, error } = await supabase
        .from('wa_campaign_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'sent')
        .gte('sent_at', startOfDayISO);

      if (error) {
        console.error('[DB wa_campaign_recipients] Erro ao contar envios de hoje:', error.message);
        return 0;
      }
      return count || 0;
    }

    let count = 0;
    for (const r of memStore.wa_campaign_recipients.values()) {
      if (r.user_id === userId && r.status === 'sent' && r.sent_at >= startOfDayISO) {
        count++;
      }
    }
    return count;
  },
};
