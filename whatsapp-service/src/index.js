import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { sessionsRouter } from './routes/sessions.js';
import { campaignsRouter } from './routes/campaigns.js';
import { waManager } from './whatsapp.js';
import { queueManager } from './queue.js';
import { db } from './db.js';

const app = express();

// Configurações básicas de segurança e parsing
app.use(cors({
  origin: config.allowedOrigin === '*' ? '*' : config.allowedOrigin.split(',').map((s) => s.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * 1. Health check público (sem autenticação)
 * Ideal para o UptimeRobot chamar a cada 5 minutos e impedir o Render de adormecer.
 */
app.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    service: 'prospecta-whatsapp-service',
    version: '1.0.0',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    timezone: config.timezone,
    database: db.isSupabaseConnected() ? 'supabase-connected' : 'memory-fallback',
    activeSessions: waManager.getAllSessions().map((s) => ({
      userId: s.userId,
      state: s.state,
      phone: s.phone,
    })),
  });
});

/**
 * 2. Middleware de autenticação por API Key
 * Todas as rotas /sessions e /campaigns exigem o header x-api-key correto.
 */
function requireApiKey(req, res, next) {
  const incomingKey = req.headers['x-api-key'] || req.query.api_key;

  if (!incomingKey || incomingKey !== config.apiKey) {
    return res.status(401).json({
      ok: false,
      error: 'Não autorizado: Chave de API inválida ou ausente (header "x-api-key").',
    });
  }

  next();
}

app.use('/sessions', requireApiKey, sessionsRouter);
app.use('/campaigns', requireApiKey, campaignsRouter);

// Tratamento de rotas inexistentes
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Endpoint não encontrado.' });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error('[App Error]:', err);
  res.status(500).json({ ok: false, error: err.message || 'Erro interno no microserviço.' });
});

// Arranque do servidor
const server = app.listen(config.port, async () => {
  console.log(`====================================================`);
  console.log(`🚀 PROSPECTA WHATSAPP SERVICE EM EXECUÇÃO`);
  console.log(`📍 Porta: ${config.port}`);
  console.log(`🔒 Origem permitida: ${config.allowedOrigin}`);
  console.log(`⏰ Fuso Horário: ${config.timezone}`);
  console.log(`💾 Base de Dados: ${db.isSupabaseConnected() ? 'Supabase' : 'Memória (Fallback)'}`);
  console.log(`====================================================`);

  // Restaura todas as sessões e retoma campanhas ativas
  try {
    await waManager.restoreAllSessions();
    await queueManager.restoreActiveCampaigns();
  } catch (initErr) {
    console.error('[Startup] Falha na auto-recuperação inicial:', initErr.message);
  }
});

// Encerramento seguro (Graceful Shutdown)
function handleShutdown(signal) {
  console.log(`\n[Shutdown] Recebido sinal ${signal}. A encerrar com segurança...`);
  server.close(() => {
    console.log('[Shutdown] Servidor HTTP finalizado.');
    process.exit(0);
  });

  // Força encerramento após 10 segundos se demorar
  setTimeout(() => {
    console.error('[Shutdown] Forçando encerramento imediato.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
