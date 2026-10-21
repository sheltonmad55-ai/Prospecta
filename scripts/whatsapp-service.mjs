import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import QRCode from 'qrcode';
import * as baileys from '@whiskeysockets/baileys';

const makeWASocket = baileys.default || baileys.makeWASocket;
const { useMultiFileAuthState, DisconnectReason } = baileys;

const PORT = Number(process.env.WHATSAPP_PORT || 5050);
const SESSION_DIR = path.resolve(process.cwd(), '.whatsapp-session');

let sock = null;
let status = 'initializing'; // 'waiting_qr' | 'connected' | 'disconnected' | 'connecting'
let currentQR = null;
let currentQRDataUrl = null;
let connectedUser = null;

async function startWhatsApp() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  status = 'connecting';
  console.log('[Baileys] A inicializar motor do WhatsApp...');

  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Prospecta SaaS', 'Desktop', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = qr;
        currentQRDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
        status = 'waiting_qr';
        console.log(`\n📱 [WhatsApp] Novo QR Code pronto! Aceda a http://localhost:${PORT} para escanear com o seu telemóvel.`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        status = 'disconnected';
        currentQR = null;
        currentQRDataUrl = null;
        connectedUser = null;

        if (shouldReconnect) {
          console.log('[WhatsApp] Conexão interrompida. A restabelecer em 3s...');
          setTimeout(startWhatsApp, 3000);
        } else {
          console.log('[WhatsApp] Sessão encerrada (Logout). A limpar sessão...');
          try {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
          } catch {}
          setTimeout(startWhatsApp, 2000);
        }
      } else if (connection === 'open') {
        status = 'connected';
        currentQR = null;
        currentQRDataUrl = null;
        connectedUser = sock.user?.id ? sock.user.id.split(':')[0].replace(/\D/g, '') : 'Conectado';
        console.log(`\n🎉 [WhatsApp] CONECTADO COM SUCESSO! Número: +${connectedUser}\nPronto para disparos automáticos na Prospecta.`);
      }
    });
  } catch (err) {
    console.error('[Baileys] Erro ao inicializar socket:', err);
    setTimeout(startWhatsApp, 5000);
  }
}

function renderHtmlPage() {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prospecta · Conexão WhatsApp Baileys</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0B132B;
      color: #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: #111C38;
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 18px;
      max-width: 480px;
      width: 100%;
      padding: 32px 28px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #38BDF8;
      font-weight: 800;
      font-size: 18px;
      letter-spacing: -0.5px;
      margin-bottom: 20px;
    }
    h1 { font-size: 20px; margin-bottom: 8px; color: #FFFFFF; }
    p { font-size: 13.5px; color: #94A3B8; line-height: 1.5; margin-bottom: 24px; }
    .qr-box {
      background: #FFFFFF;
      padding: 16px;
      border-radius: 12px;
      display: inline-block;
      margin-bottom: 20px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    .qr-box img { display: block; max-width: 250px; width: 100%; height: auto; }
    .connected-box {
      background: rgba(37, 211, 102, 0.12);
      border: 1px solid rgba(37, 211, 102, 0.35);
      border-radius: 12px;
      padding: 24px 20px;
      margin-bottom: 20px;
    }
    .connected-box h2 { color: #25D366; font-size: 18px; margin-bottom: 6px; }
    .connected-box span { color: #E2E8F0; font-size: 15px; font-weight: 600; }
    .steps {
      text-align: left;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 20px;
      font-size: 12.5px;
      color: #CBD5E1;
      line-height: 1.6;
    }
    .steps ol { padding-left: 18px; }
    .btn {
      display: inline-block;
      background: #2563EB;
      color: #FFFFFF;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn:hover { background: #1D4ED8; }
    .btn-danger { background: rgba(239, 68, 68, 0.2); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.4); }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.35); }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .badge-waiting { background: rgba(234, 179, 8, 0.15); color: #FACC15; border: 1px solid rgba(234, 179, 8, 0.3); }
    .badge-connecting { background: rgba(59, 130, 246, 0.15); color: #93C5FD; border: 1px solid rgba(59, 130, 246, 0.3); }
  </style>
</head>
<body>
  <div class="card" id="app">
    <div class="brand">⚡ PROSPECTA · DISPARO WHATSAPP</div>
    <div id="content">Carregando status...</div>
  </div>

  <script>
    async function update() {
      try {
        const res = await fetch('/status');
        const data = await res.json();
        const content = document.getElementById('content');

        if (data.connected) {
          content.innerHTML = \`
            <div class="connected-box">
              <h2>🟢 Conectado com Sucesso!</h2>
              <span>Número ativo: +\${data.user || 'Desconhecido'}</span>
            </div>
            <p>O motor Baileys está ativo e pronto para disparos em segundo plano na Prospecta.</p>
            <div style="display:flex; gap:10px; justify-content:center;">
              <a href="http://localhost:3000" class="btn">Voltar para a Prospecta</a>
              <button onclick="logout()" class="btn btn-danger">Desconectar</button>
            </div>
          \`;
        } else if (data.status === 'waiting_qr' && data.qrDataUrl) {
          content.innerHTML = \`
            <span class="badge badge-waiting">⏳ Aguardando leitura do QR Code</span>
            <h1>Conectar WhatsApp Grátis</h1>
            <p>Escaneie o código abaixo com o WhatsApp do seu telemóvel para habilitar o envio em lote.</p>
            <div class="qr-box">
              <img src="\${data.qrDataUrl}" alt="QR Code WhatsApp" />
            </div>
            <div class="steps">
              <ol>
                <li>Abra o <b>WhatsApp</b> no telemóvel</li>
                <li>Toque no <b>Menu (três pontos)</b> ou <b>Configurações</b></li>
                <li>Selecione <b>Aparelhos Conectados</b></li>
                <li>Toque em <b>Conectar um aparelho</b> e aponte para o ecrã</li>
              </ol>
            </div>
          \`;
        } else {
          content.innerHTML = \`
            <span class="badge badge-connecting">🔄 A inicializar conexão...</span>
            <h1>Aguarde um instante</h1>
            <p>O serviço Baileys está a gerar o seu código de acesso seguro.</p>
          \`;
        }
      } catch (e) {
        document.getElementById('content').innerHTML = '<p style="color:#F87171;">Não foi possível contactar o serviço. Certifique-se de que o script está ativo.</p>';
      }
    }

    async function logout() {
      if (!confirm('Deseja realmente desconectar este WhatsApp?')) return;
      await fetch('/logout', { method: 'POST' });
      location.reload();
    }

    setInterval(update, 3500);
    update();
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/' || url.pathname === '/qr') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderHtmlPage());
    return;
  }

  if (url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      status,
      connected: status === 'connected',
      user: connectedUser,
      qrDataUrl: currentQRDataUrl
    }));
    return;
  }

  if (url.pathname === '/send' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        if (status !== 'connected' || !sock) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'WhatsApp não está conectado. Escaneie o QR Code em http://localhost:' + PORT }));
          return;
        }

        const data = JSON.parse(body || '{}');
        let phone = String(data.phone || '').replace(/\D/g, '');
        const message = String(data.message || '').trim();

        if (phone.length === 9 && /^8[2-7]/.test(phone)) {
          phone = '258' + phone;
        }

        if (!phone || phone.length < 8) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Número de telefone inválido.' }));
          return;
        }

        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Mensagem não pode estar vazia.' }));
          return;
        }

        const jid = `${phone}@s.whatsapp.net`;
        const result = await sock.sendMessage(jid, { text: message });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          messageId: result?.key?.id || 'sent',
          to: jid,
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error('[Baileys] Erro ao enviar mensagem:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message || 'Falha no envio da mensagem' }));
      }
    });
    return;
  }

  if (url.pathname === '/logout' && req.method === 'POST') {
    try {
      if (sock) {
        await sock.logout().catch(() => {});
      }
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
      status = 'disconnected';
      connectedUser = null;
      currentQR = null;
      currentQRDataUrl = null;
      setTimeout(startWhatsApp, 1000);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, message: 'Sessão reiniciada.' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint não encontrado' }));
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SERVIÇO WHATSAPP BAILEYS ATIVO NA PORTA ${PORT}`);
  console.log(`👉 Aceda no navegador: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
  startWhatsApp();
});
