# Guia de Operação e Implantação: WhatsApp Microservice em Produção
## Prospecta SaaS · Baileys Persistente & Zero Custos

Este documento detalha o funcionamento, implantação gratuita, migração estável e testes de aceitação da integração de WhatsApp da **Prospecta**.

---

## 0. Diagnóstico & Arquitetura de Produção

### Por que a Vercel não suporta Baileys diretamente?
A Vercel executa código através de **funções serverless** efêmeras com tempo de vida limitado a poucos segundos. O protocolo do WhatsApp (Baileys) exige uma **ligação WebSocket contínua (stateful)**, troca constante de pacotes `keep-alive`, e persistência local de chaves criptográficas (`creds` e `keys`). Em serverless, a conexão morre no instante em que a requisição HTTP termina.

### Solução Arquitetural
Dividimos o sistema em duas camadas desacopladas e seguras:

```
[ Navegador do Utilizador ]
       │  (Sessão Next.js / Cookie JWT)
       ▼
[ Prospecta Frontend & Proxy na Vercel ]
       │  (Rotas /api/wa/* validam utilizador autenticado)
       │  (Injeta secretamente x-api-key; browser NUNCA vê chaves nem URLs internos)
       ▼ HTTPS
[ whatsapp-service (Microserviço Node 20 / Docker) ]
  ├── Gestor Multi-sessões (Map de sockets Baileys por userId)
  ├── useDbAuthState(userId): Credenciais e chaves gravadas em Postgres/Supabase
  ├── Fila Segura Anti-Bloqueio (20s-60s delay, presença 'digitando...', limites diários)
  └── Normalizador de Números Moçambique (+258 8X...) e Validador onWhatsApp()
       ▲
       │  (Lê/Grava credenciais wa_auth, campanhas e opt-outs)
       ▼
[ Base de Dados Supabase (Tabelas wa_auth, wa_campaigns, wa_optout) ]
```

---

## 1. Implantação Gratuita Inicial no Render

O **Render** oferece um nível gratuito (*Free Web Service*) capaz de correr contentores Docker com suporte a WebSockets contínuos.

### 1.1. Pré-requisito na Base de Dados
Execute a migração SQL no seu projeto Supabase (disponível em `whatsapp-service/schema.sql` ou `supabase/migrations/202610240001_whatsapp_service.sql`):
- Cria as tabelas `wa_auth`, `wa_optout`, `wa_campaigns` e `wa_campaign_recipients`.

### 1.2. Criação do Serviço no Render
1. Aceda ao [dashboard do Render](https://dashboard.render.com/) e clique em **New +** -> **Web Service**.
2. Conecte o repositório GitHub onde o projeto está hospedado.
3. Configure os seguintes parâmetros:
   - **Name**: `prospecta-whatsapp-service`
   - **Region**: Frankfurt (EU Central) ou Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `whatsapp-service`
   - **Environment / Runtime**: `Docker`
   - **Instance Type**: `Free`
4. Na secção **Environment Variables**, adicione as seguintes variáveis:

| Variável | Valor Recomendado / Descrição |
| :--- | :--- |
| `PORT` | `10000` |
| `API_KEY` | Uma chave aleatória gerada (ex: `openssl rand -hex 32`) |
| `ALLOWED_ORIGIN` | `https://prospecta-mz.vercel.app` (e `http://localhost:3000` se for testar local) |
| `SUPABASE_URL` | O URL do seu Supabase (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Chave `service_role` secreta do seu Supabase (necessária para ler/escrever `wa_auth`) |
| `TZ` | `Africa/Maputo` |

5. Clique em **Deploy Web Service**. Guarde o URL gerado (ex: `https://prospecta-whatsapp-service.onrender.com`).

### 1.3. Como evitar que o Render adormeça (Keep-Alive Gratuito)
O plano gratuito do Render desliga os contentores após 15 minutos sem requisições HTTP. Para manter o WhatsApp sempre conectado e sem latência:
1. Registe uma conta gratuita no [UptimeRobot](https://uptimerobot.com/).
2. Adicione um **New Monitor**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Prospecta WhatsApp Service`
   - **URL (or IP)**: `https://prospecta-whatsapp-service.onrender.com/health`
   - **Monitoring Interval**: `5 minutes`
3. Salve o monitor. O endpoint `/health` responde com código `200 { status: 'ok' }` sem necessidade de autenticação, mantendo a instância ativa 24 horas por dia.

### 1.4. Resiliência e Cuidados com o Render Free
- **Disco Efémero**: Os contentores gratuitos do Render reiniciam periodicamente. Como implementámos `useDbAuthState(userId)` gravando na tabela `wa_auth`, **a sessão de WhatsApp e as campanhas são restauradas automaticamente no boot sem necessidade de ler novo QR code**.
- **Base de Dados Render**: Atenção: a base de dados PostgreSQL oferecida gratuitamente pela Render expira em 30 dias. Por isso, utilize sempre o **Supabase** (permanente e gratuito) como configurado nas variáveis acima.

---

## 2. Migração para Produção Estável e Ilimitada: Oracle Cloud Always Free

A **Oracle Cloud** disponibiliza instâncias de computação gratuitas vitalícias (*Always Free Tier*), sem limitações de suspensão, ideais para manter processos Node.js e Docker 100% ativos com performance superior.

> **Nota de Transparência:** A Oracle solicita um cartão de crédito no momento do cadastro unicamente para validação anti-fraude da identidade do utilizador. Nenhuma cobrança é efetuada desde que utilize os recursos marcados como *Always Free*.

### 2.1. Criação da Máquina Virtual (VM)
1. No painel da Oracle Cloud, vá para **Compute** -> **Instances** -> **Create Instance**.
2. **Image**: `Ubuntu 22.04 LTS` ou `Ubuntu 24.04 LTS`.
3. **Shape**:
   - *Opção Recomendada (Ampere ARM)*: `VM.Standard.A1.Flex` com 2 a 4 OCPUs e 12 a 24 GB de RAM (100% Always Free).
   - *Opção Alternativa (AMD x86)*: `VM.Standard.E2.1.Micro` com 1 OCPU e 1 GB de RAM.
4. Descarregue a sua chave SSH privada (`id_rsa`) e inicialize a máquina.

### 2.2. Abertura de Portas de Rede (VCN Security List)
No painel da Oracle:
1. Vá a **Networking** -> **Virtual Cloud Networks** -> Selecione a sua VCN -> **Security Lists** -> **Default Security List**.
2. Adicione **Ingress Rules**:
   - Source CIDR: `0.0.0.0/0`
   - Destination Port Range: `80,443` (HTTP e HTTPS para o Caddy)
   - Protocol: `TCP`

Na VM via terminal SSH:
```bash
ssh -i /caminho/para/chave.key ubuntu@<IP_PUBLICO_DA_VM>

# Atualizar pacotes do sistema
sudo apt update && sudo apt upgrade -y

# Ajustar firewall local (iptables / ufw)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || true
```

### 2.3. Instalação do Docker e do Caddy (com SSL HTTPS Automático)
```bash
# 1. Instalar Docker e Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# 2. Clonar o repositório ou transferir a pasta whatsapp-service
git clone https://github.com/SEU_USER/Prospecta.git
cd Prospecta/whatsapp-service

# 3. Criar arquivo de variáveis .env
cat << 'EOF' > .env
PORT=3001
API_KEY=sua_chave_ultra_secreta_aqui
ALLOWED_ORIGIN=https://prospecta-mz.vercel.app
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=sua_service_role_key
TZ=Africa/Maputo
EOF

# 4. Construir e iniciar a aplicação com Docker
docker build -t whatsapp-service .
docker run -d --restart unless-stopped --name wa-service --env-file .env -p 3001:3001 whatsapp-service
```

### 2.4. Proxy Reverso Caddy com HTTPS Let's Encrypt Gratuito
Instale o Caddy na VM para obter certificado SSL automático com renovação transparente:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLF 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLF 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy -y

# Configurar o Caddyfile apontando o seu domínio ou subdomínio (ex: wa.seudominio.com):
sudo nano /etc/caddy/Caddyfile
```
Conteúdo do `/etc/caddy/Caddyfile`:
```caddy
wa.seudominio.com {
    reverse_proxy 127.0.0.1:3001
}
```
Recarregue o Caddy:
```bash
sudo systemctl reload caddy
```
O Caddy emite o certificado SSL automaticamente e mantém o endpoint HTTPS disponível em `https://wa.seudominio.com`.

---

## 3. Configuração de Variáveis de Ambiente na Vercel

No painel do seu projeto na [Vercel](https://vercel.com/) (Settings -> Environment Variables):

1. **`WHATSAPP_SERVICE_URL`**:
   - Se estiver no Render: `https://prospecta-whatsapp-service.onrender.com`
   - Se estiver na Oracle Cloud: `https://wa.seudominio.com`
2. **`WHATSAPP_SERVICE_KEY`**:
   - A mesma string gerada para a `API_KEY` do microserviço.

Após salvar, execute um novo deploy ou clique em **Redeploy** na Vercel para carregar as novas variáveis.

---

## 4. Testes de Validação com `curl`

Gere a sua chave secreta antes de começar:
```bash
openssl rand -hex 32
# Exemplo: 7f8a9b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcd
```

Substitua `https://wa.service.com` e o header `x-api-key` pelos seus valores reais:

### 4.1. Verificação de Saúde (Liveness Probe)
```bash
curl -i https://wa.service.com/health
```
*Resposta esperada:* `HTTP 200 OK`
```json
{ "status": "ok", "uptime": 120, "timestamp": "2026-10-24T00:30:00.000Z", "activeSessions": 0 }
```

### 4.2. Iniciar Sessão e Gerar QR Code
```bash
curl -X POST https://wa.service.com/sessions/usuario_teste_123/connect \
  -H "x-api-key: SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json"
```

### 4.3. Consultar Estado da Sessão e Obter QR Code
```bash
curl https://wa.service.com/sessions/usuario_teste_123/status \
  -H "x-api-key: SUA_CHAVE_SECRETA"
```
*Resposta enquanto aguarda leitura:*
```json
{
  "state": "qr",
  "qr": "data:image/png;base64,iVBORw0KGgo...",
  "phone": null,
  "connected": false
}
```
*Resposta após conexão realizada:*
```json
{
  "state": "connected",
  "qr": null,
  "phone": "258841234567",
  "connected": true
}
```

### 4.4. Disparo de Teste Individual
```bash
curl -X POST https://wa.service.com/sessions/usuario_teste_123/send \
  -H "x-api-key: SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "841234567",
    "message": "Olá! Esta é uma mensagem de teste da Prospecta com Baileys em produção."
  }'
```
*O serviço normaliza automaticamente `841234567` para `258841234567@s.whatsapp.net` antes do envio.*

### 4.5. Criar Campanha em Fila Segura com Spintax
```bash
curl -X POST https://wa.service.com/campaigns \
  -H "x-api-key: SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "usuario_teste_123",
    "name": "Campanha Piloto",
    "messageTemplate": "{Olá|Bom dia|Viva} {nome_empresa}! Notamos a sua presença em {cidade} e gostaríamos de apresentar o nosso serviço de {servico}.",
    "recipients": [
      { "phone": "841112233", "vars": { "nome_empresa": "Restaurante Zambi", "cidade": "Maputo", "servico": "Criação de websites" } },
      { "phone": "824445566", "vars": { "nome_empresa": "Oficina Central", "cidade": "Matola", "servico": "Gestão de Redes Sociais" } },
      { "phone": "867778899", "vars": { "nome_empresa": "Farmácia Nova", "cidade": "Beira", "servico": "Tráfego Pago" } }
    ],
    "settings": {
      "minDelaySec": 20,
      "maxDelaySec": 60,
      "dailyLimit": 40,
      "startHour": 8,
      "endHour": 19
    }
  }'
```

### 4.6. Consultar Progresso da Campanha
```bash
curl https://wa.service.com/campaigns/UUID_DA_CAMPANHA \
  -H "x-api-key: SUA_CHAVE_SECRETA"
```
*Resposta detalhada:*
```json
{
  "ok": true,
  "campaign": {
    "id": "UUID_DA_CAMPANHA",
    "status": "running",
    "total": 3,
    "sent_count": 1,
    "failed_count": 0,
    "skipped_count": 0,
    "current_index": 1,
    "recipients": [ ... ]
  }
}
```

### 4.7. Pausar, Retomar ou Cancelar Campanha
```bash
# Pausar
curl -X POST https://wa.service.com/campaigns/UUID_DA_CAMPANHA/pause -H "x-api-key: SUA_CHAVE_SECRETA"

# Retomar
curl -X POST https://wa.service.com/campaigns/UUID_DA_CAMPANHA/resume -H "x-api-key: SUA_CHAVE_SECRETA"

# Cancelar
curl -X POST https://wa.service.com/campaigns/UUID_DA_CAMPANHA/cancel -H "x-api-key: SUA_CHAVE_SECRETA"
```

### 4.8. Desconectar e Limpar Credenciais
```bash
curl -X POST https://wa.service.com/sessions/usuario_teste_123/logout \
  -H "x-api-key: SUA_CHAVE_SECRETA"
```

---

## 5. Roteiro do Teste de Aceitação Final

Execute os seguintes passos para validação completa da entrega em produção:

1. **Ligação por QR Code**:
   - Abra a página **Integrações & WhatsApp** na Prospecta (`/`).
   - Verifique que os avisos "Brevemente" e "Em manutenção" foram removidos.
   - Clique em **"Gerar QR Code"**. O QR code real em alta resolução é exibido em até 3 segundos.
   - Abra o WhatsApp no seu smartphone -> **Aparelhos Conectados** -> **Conectar Aparelho** e leia o código.
   - O painel atualiza automaticamente para `🟢 ONLINE · +2588XXXXXXXX`.

2. **Disparo de Teste para o Número Próprio**:
   - No cartão "Disparo de Teste Individual", introduza o seu próprio contacto móvel (com ou sem código `258`, ex.: `84XXXXXXX`).
   - Clique em **"Enviar Teste"**.
   - Confirme a receção instantânea no seu telemóvel.

3. **Teste de Resiliência a Reinícios (Zero perda de sessão)**:
   - No painel do Render ou via terminal na VM Oracle (`docker restart wa-service`), reinicie o contentor.
   - Recarregue a página da Prospecta.
   - **Resultado Esperado**: O status permanece `🟢 ONLINE` sem pedir leitura de QR code, pois as chaves criptográficas foram carregadas diretamente da tabela `wa_auth` do Supabase.

4. **Campanha Real com Proteção Anti-Bloqueio (3 contactos)**:
   - Selecione 3 leads na aba de pesquisa ou CRM.
   - Edite o modelo com variáveis e spintax (ex.: `{Olá|Bom dia} {nome_empresa}`).
   - Clique em **"Iniciar Campanha"**.
   - No modal de confirmação, verifique os parâmetros de segurança e confirme o início.
   - Acompanhe a barra de progresso em tempo real (notando o atraso de 20 a 60 segundos entre disparos e o status de digitação).
   - Teste os botões **Pausar**, **Retomar** e, ao término, clique em **"Exportar Relatório CSV"**.

5. **Teste de Opt-out Automático ("SAIR" / "PARAR")**:
   - A partir de um número que recebeu uma mensagem da campanha, envie de volta a palavra **"SAIR"**.
   - Verifique na tabela `wa_optout` do Supabase que o contacto foi registado e nunca mais receberá novos envios.

---

## 6. Boas Práticas Anti-Bloqueio (Recomendações Comerciais)

- **Chip Dedicado**: Utilize sempre um cartão SIM pré-pago dedicado exclusivamente à prospeção comercial da sua agência. Nunca utilize o seu contacto pessoal ou familiar.
- **Aquecimento de Número Novo (Warm-up)**: Se comprou um chip novo, converse ativamente com amigos e clientes habituais durante 7 a 14 dias antes de iniciar campanhas maiores.
- **Variação com Spintax**: Sempre use formatos como `{Olá|Bom dia|Viva}` e `{gostaríamos de|queremos}` para evitar que o algoritmo da Meta detete mensagens repetidas idênticas.
- **Respeito aos Limites Diários**: Mantenha o padrão de 30 a 50 envios por dia por número para garantir a longevidade da conta.
