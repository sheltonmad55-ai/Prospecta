# Guia Rápido de Configuração: WhatsApp da Prospecta em Produção

Este ficheiro foi preparado para que qualquer pessoa (mesmo sem conhecimentos técnicos de programação) consiga colocar o WhatsApp da Prospecta a funcionar em produção em 10 minutos, a custo zero.

---

## 🔑 A Sua Chave Secreta Exclusiva (API Key)

Esta é a chave de alta segurança gerada para ligar a sua Prospecta na Vercel ao seu servidor de WhatsApp no Render:

```text
bd5dc78e424830527a23f07ca73f1844ef028ca2546f7aa5dd8863bfee9347f5
```
> ⚠️ **Aviso de Segurança**: Guarde esta chave apenas nos painéis da Render e da Vercel. Não a partilhe com ninguém nem a publique em chats públicos.

---

## 📋 Tabela 1: Variáveis para colar na Render (Web Service)

Ao criar o serviço na Render, copie e cole estas variáveis exatamente como estão:

| Nome da Variável | Valor a Colar | Onde encontrar / Explicação |
| :--- | :--- | :--- |
| `PORT` | `10000` | Porta padrão do Render |
| `API_KEY` | `bd5dc78e424830527a23f07ca73f1844ef028ca2546f7aa5dd8863bfee9347f5` | A sua chave gerada acima |
| `ALLOWED_ORIGIN` | `https://prospecta-mz.vercel.app` | O endereço do seu site na Vercel |
| `SUPABASE_URL` | *O URL do seu projeto Supabase* | Painel Supabase: **Project Settings (ícone de engrenagem) ➔ Data API ➔ Project URL** (ex: `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | *A sua chave service_role secreta* | Painel Supabase: **Project Settings ➔ Data API ➔ Project API Keys ➔ chave `service_role` (Secret)** (começa por `eyJ...`) |
| `TZ` | `Africa/Maputo` | Fuso horário de Moçambique para respeitar o horário de envios |

---

## 📋 Tabela 2: Variáveis para colar na Vercel (Frontend)

No painel do seu projeto na Vercel (**Settings ➔ Environment Variables**):

| Nome da Variável | Valor a Colar | Quando preencher |
| :--- | :--- | :--- |
| `WHATSAPP_SERVICE_KEY` | `bd5dc78e424830527a23f07ca73f1844ef028ca2546f7aa5dd8863bfee9347f5` | Imediatamente (a mesma chave) |
| `WHATSAPP_SERVICE_URL` | `https://....onrender.com` | **Preencher depois do Passo 2**, quando a Render gerar o link do seu serviço |

---

## 🚀 Passo a Passo Ilustrado (Clique a Clique)

### Passo 1: Preparar a Base de Dados no Supabase (1 minuto)

1. Aceda a [supabase.com/dashboard](https://supabase.com/dashboard) e entre no projeto da **Prospecta**.
2. No menu lateral esquerdo, clique no ícone **SQL Editor** (parece um terminal `>_`).
3. Clique em **+ New query**.
4. Copie o bloco de código SQL abaixo na íntegra, cole-o no editor e clique no botão verde **Run** (ou `Ctrl + Enter`):

```sql
-- TABELAS PARA O SERVIÇO DE WHATSAPP (PROSPECTA)
CREATE TABLE IF NOT EXISTS public.wa_auth (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_wa_auth_user ON public.wa_auth(user_id);

CREATE TABLE IF NOT EXISTS public.wa_optout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'SAIR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_wa_optout_lookup ON public.wa_optout(user_id, phone);

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
```
5. Deverá aparecer a mensagem **"Success. No rows returned"**. As 4 tabelas estão criadas.
*(Nota: O ficheiro `whatsapp-service/schema.sql` e a migração são exatamente iguais; rodar este script uma única vez é suficiente).*

---

### Passo 2: Criar o Servidor Gratuito na Render (3 minutos)

1. Aceda a [render.com](https://render.com/) e crie conta gratuita (pode entrar diretamente com o seu GitHub).
2. No painel inicial, clique no botão azul **New +** no canto superior direito e selecione **Web Service**.
3. Escolha **"Build and deploy from a Git repository"** e clique em **Next**.
4. Conecte a sua conta GitHub e selecione o repositório **Prospecta**.
5. Preencha os campos exatamente assim:
   - **Name**: `prospecta-whatsapp-service`
   - **Region**: Escolha qualquer uma (ex: *Frankfurt* ou *Oregon*)
   - **Branch**: `main`
   - **Root Directory**: `whatsapp-service` *(muito importante digitar exatamente assim)*
   - **Runtime**: `Docker` *(o Render deteta o Dockerfile automaticamente)*
   - **Instance Type**: Escolha **Free ($0/month)**
6. Mais abaixo, na secção **Environment Variables**, clique em **Add Environment Variable** e adicione as 6 variáveis da **Tabela 1**:
   - `PORT` = `10000`
   - `API_KEY` = `bd5dc78e424830527a23f07ca73f1844ef028ca2546f7aa5dd8863bfee9347f5`
   - `ALLOWED_ORIGIN` = `https://prospecta-mz.vercel.app`
   - `SUPABASE_URL` = *(o seu URL do Supabase)*
   - `SUPABASE_SERVICE_KEY` = *(a sua chave service_role do Supabase)*
   - `TZ` = `Africa/Maputo`
7. Clique no botão azul **Deploy Web Service** no final da página.
8. Aguarde cerca de 2 a 3 minutos até aparecer a mensagem verde **"Live"**.
9. No topo da página, copie o URL gerado (exemplo: `https://prospecta-whatsapp-service.onrender.com`).

---

### Passo 3: Testar o Servidor no Navegador (30 segundos)

1. Abra uma nova aba no seu navegador e cole o URL da Render seguido de `/health`.
   - Exemplo: `https://prospecta-whatsapp-service.onrender.com/health`
2. Se responder com um texto como este:
   ```json
   {"status":"ok","service":"prospecta-whatsapp-service","version":"1.0.0", ...}
   ```
   **Parabéns! O seu servidor de WhatsApp está 100% online e a funcionar.**

---

### Passo 4: Ligar a Vercel ao Servidor Render (2 minutos)

1. Aceda ao painel da sua conta na [vercel.com](https://vercel.com/) e entre no projeto **prospecta**.
2. Clique no menu superior **Settings** e depois em **Environment Variables** no menu lateral.
3. Adicione as duas variáveis da **Tabela 2**:
   - Nome: `WHATSAPP_SERVICE_KEY` | Valor: `bd5dc78e424830527a23f07ca73f1844ef028ca2546f7aa5dd8863bfee9347f5`
   - Nome: `WHATSAPP_SERVICE_URL` | Valor: O URL copiado da Render (ex: `https://prospecta-whatsapp-service.onrender.com`)
4. Para que as novas variáveis tenham efeito imediato:
   - Vá ao menu **Deployments** (no topo do painel da Vercel).
   - No deploy mais recente, clique nos três pontinhos (`...`) à direita e selecione **Redeploy**.
   - Clique em **Redeploy** na janela de confirmação. Demora menos de 1 minuto.

---

### Passo 5: Manter o Servidor Sempre Acordado com UptimeRobot (1 minuto)

O plano gratuito da Render adormece se ficar 15 minutos sem visitas. Para que o seu WhatsApp fique ligado 24 horas por dia sem adormecer:

1. Aceda a [uptimerobot.com](https://uptimerobot.com/) e crie uma conta gratuita.
2. Clique em **+ Add New Monitor**.
3. Preencha apenas:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Prospecta WhatsApp`
   - **URL (or IP)**: Cole o seu URL com `/health` (ex: `https://prospecta-whatsapp-service.onrender.com/health`)
   - **Monitoring Interval**: `Every 5 minutes`
4. Clique em **Create Monitor**.
O UptimeRobot fará uma chamada leve a cada 5 minutos, mantendo a Render 100% ativa sem nenhum custo.

---

### Passo 6: Primeiro Teste na Prospecta

1. Abra o site da Prospecta: [https://prospecta-mz.vercel.app](https://prospecta-mz.vercel.app).
2. Entre na sua conta e clique no menu lateral **Integrações & WhatsApp**.
3. No cartão **Conexão WhatsApp**, clique em **"Gerar QR Code"**.
4. O QR Code aparecerá no ecrã. Abra o WhatsApp no telemóvel (recomendamos um chip novo exclusivo para prospeção), vá a **Aparelhos Conectados ➔ Conectar Aparelho** e aponte a câmara.
5. O estado mudará para `🟢 ONLINE · +2588XXXXXXX`.
6. No cartão ao lado, faça um **Disparo de Teste** para o seu próprio número de telemóvel e confirme que a mensagem chega imediatamente.
7. **Teste de Prova Real (Resiliência)**: Vá ao painel da Render, clique em **Manual Deploy ➔ Restart Service**. Aguarde 30 segundos e recarregue a página da Prospecta: o WhatsApp continuará conectado sem pedir novo QR Code, porque as credenciais foram guardadas em segurança no seu Supabase!
