-- ============================================================
-- PROSPECTA SAAS - SCHEMA DO MICROSERVIÇO WHATSAPP (BAILEYS)
-- Execute este script no SQL Editor do Supabase (gratuito)
-- ============================================================

-- 1. Tabela para autenticação e sessões persistentes do Baileys
-- Salva credenciais (creds) e chaves criptográficas (keys) por utilizador.
-- O disco efémero do Render/Docker pode reiniciar à vontade sem perder a sessão.
CREATE TABLE IF NOT EXISTS public.wa_auth (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_wa_auth_user ON public.wa_auth(user_id);

-- 2. Tabela de Opt-out / Lista de Exclusão (SAIR / PARAR)
-- Se qualquer destinatário responder com palavras de cancelamento,
-- o sistema guarda o contacto aqui e nunca mais lhe envia mensagens.
CREATE TABLE IF NOT EXISTS public.wa_optout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'SAIR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_wa_optout_lookup ON public.wa_optout(user_id, phone);

-- 3. Tabela de Campanhas de Disparo
-- Guarda o estado de cada campanha, configurações anti-bloqueio e contadores.
CREATE TABLE IF NOT EXISTS public.wa_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{
    "minDelaySec": 20,
    "maxDelaySec": 60,
    "dailyLimit": 40,
    "startHour": 8,
    "endHour": 19,
    "pauseEvery": 20,
    "pauseDurationMinutes": 7
  }'::JSONB,
  status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'paused', 'completed', 'cancelled', 'failed')),
  stats JSONB NOT NULL DEFAULT '{
    "total": 0,
    "sent": 0,
    "failed": 0,
    "ignored": 0,
    "optout": 0
  }'::JSONB,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_campaigns_user_status ON public.wa_campaigns(user_id, status);

-- 4. Tabela de Destinatários das Campanhas
-- Fila persistente: se o servidor reiniciar a meio de uma campanha,
-- a fila retoma automaticamente do último lead pendente.
CREATE TABLE IF NOT EXISTS public.wa_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.wa_campaigns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  vars JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'failed', 'ignored', 'optout')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_campaign_recipients_queue ON public.wa_campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_wa_campaign_recipients_phone ON public.wa_campaign_recipients(user_id, phone);

-- Habilitar RLS e permitir que a service_role tenha acesso total
ALTER TABLE public.wa_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_optout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_campaign_recipients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wa_auth' AND policyname = 'Service Role Full Access wa_auth') THEN
    CREATE POLICY "Service Role Full Access wa_auth" ON public.wa_auth FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wa_optout' AND policyname = 'Service Role Full Access wa_optout') THEN
    CREATE POLICY "Service Role Full Access wa_optout" ON public.wa_optout FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wa_campaigns' AND policyname = 'Service Role Full Access wa_campaigns') THEN
    CREATE POLICY "Service Role Full Access wa_campaigns" ON public.wa_campaigns FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wa_campaign_recipients' AND policyname = 'Service Role Full Access wa_campaign_recipients') THEN
    CREATE POLICY "Service Role Full Access wa_campaign_recipients" ON public.wa_campaign_recipients FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

