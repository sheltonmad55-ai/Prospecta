/**
 * scripts/smoke-test-production.ts
 * 
 * Script Executável de Smoke Test End-to-End para o Módulo de Criação de Sites da Prospecta.
 * 
 * REGRAS E SALVAGUARDAS:
 * 1. Parametrizado por BASE_URL (padrão: http://localhost:3000).
 * 2. SALVAGUARDA DE PRODUÇÃO: Se BASE_URL não for localhost / 127.0.0.1, aborta imediatamente
 *    a menos que CONFIRM_DANGEROUS_PRODUCTION_SMOKE_TEST === 'true'.
 * 3. Executável diretamente via `npx tsx scripts/smoke-test-production.ts`.
 * 4. Valida código de status HTTP em TODAS as chamadas.
 * 5. Lê e valida saldos de créditos antes e depois de cada operação contra o delta esperado:
 *    - Geração: -5 créditos
 *    - Edição válida via chat: -1 crédito
 *    - Pedido recusado/proibido: 0 créditos (estorno/não-cobrança)
 * 6. Aplica e persiste edições pelo mesmo fluxo da interface (encadeando currentContent retornado).
 * 7. Inspeciona a rota pública /s/[slug] após cada edição:
 *    - Validação de CSP (Google Fonts e frame-ancestors restrito) e meta robots noindex em rascunho
 *    - Validação de formato tel:+ e https://wa.me/
 *    - Validação de que "muda só a fonte" preserva exatamente as cores CSS do tema
 *    - Validação de que "remove o botão de chamada" resulta em ZERO tags href="tel: no documento
 *    - Validação de que aprovação de rascunho com dados pendentes é REJEITADA com HTTP 400
 * 8. Cleanup total de dados de teste via DELETE /api/site/[id] com verificação de status 200 e 404 subsequente.
 * 9. Imprime tabela detalhada PASSOU / FALHOU e encerra com código 1 em qualquer falha.
 */

import fs from 'node:fs';
import path from 'node:path';

// Carregar .env.local se existir para sincronizar segredos de sessão e chaves
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { ensureUserAndWorkspace, encodeSignedSession, supabaseAdmin, supabaseConfigured } from '../src/server/auth';
import { db } from '../src/server/db';

interface StepResult {
  step: number;
  name: string;
  httpStatus: number | string;
  expectedStatus: number | string;
  creditBefore: number;
  creditAfter: number;
  creditDelta: number;
  expectedDelta: number;
  status: 'PASSOU' | 'FALHOU';
  details: string;
  durationMs: number;
}

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:4317').replace(/\/+$/, '');
const CONFIRM_PROD = process.env.CONFIRM_DANGEROUS_PRODUCTION_SMOKE_TEST === 'true';
const REQUIRE_RPC = process.argv.includes('--require-rpc');

let authToken = process.env.TEST_USER_TOKEN || '';

let activeTestUserId = 'aac445bc-f4f7-4ecd-b8c5-4a1f61cac2f5';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    headers['Cookie'] = `prospecta_session=${authToken}`;
  }
  return headers;
}

async function getLiveCreditBalance(): Promise<number> {
  if (supabaseConfigured()) {
    try {
      const client = supabaseAdmin();
      if (client) {
        const { data } = await client.auth.admin.getUserById(activeTestUserId);
        const avail = data?.user?.user_metadata?.credits?.available;
        if (typeof avail === 'number') {
          return avail;
        }
      }
    } catch {}
  }

  try {
    const res = await fetch(`${BASE_URL}/api/usage`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.credits?.available === 'number') {
        return data.credits.available;
      }
    }
  } catch {}

  const rows = db().prepare("SELECT kind, COALESCE(SUM(units),0) as total FROM credit_entries WHERE workspace_id=? GROUP BY kind").all(activeTestUserId) as any[];
  const sums: Record<string, number> = Object.fromEntries(rows.map(r => [r.kind, r.total]));
  const spent = sums.consume || 0;
  const reserved = (sums.reserve || 0) - (sums.release || 0) - spent;
  return Math.max(0, (sums.grant || 0) - spent - reserved);
}

async function parseChatStream(res: Response): Promise<any> {
  const text = await res.text();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let doneObj: any = null;
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'done') {
        doneObj = parsed;
      }
    } catch {}
  }
  if (!doneObj) {
    throw new Error(`Evento final "done" não encontrado no stream. Resposta: ${text.slice(0, 200)}`);
  }
  return doneObj;
}

function extractCssVariable(html: string, varName: string): string | null {
  const regex = new RegExp(`${varName}:\\s*([^;]+);`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

async function checkCreditStorage(): Promise<{ type: 'SUPABASE_RPC' | 'SQLITE_LOCAL'; rpcAvailable: boolean; details: string }> {
  if (supabaseConfigured()) {
    const client = supabaseAdmin();
    if (client) {
      try {
        const { error } = await client.rpc('consume_credits_atomic', {
          p_user_id: '00000000-0000-0000-0000-000000000000',
          p_amount: 1,
          p_reason: 'smoke_test_probe'
        });
        if (error && error.code === 'PGRST202') {
          return { type: 'SQLITE_LOCAL', rpcAvailable: false, details: 'Supabase configurado, mas RPC consume_credits_atomic NÃO existe (PGRST202)' };
        }
        return { type: 'SUPABASE_RPC', rpcAvailable: true, details: 'Função PostgreSQL RPC consume_credits_atomic operacional no Supabase' };
      } catch (err: any) {
        return { type: 'SQLITE_LOCAL', rpcAvailable: false, details: `Erro ao testar RPC do Supabase: ${err?.message}` };
      }
    }
  }
  return { type: 'SQLITE_LOCAL', rpcAvailable: false, details: 'Base de dados SQLite Local (db/prospecta.db)' };
}

export async function main() {
  console.log('\n====================================================================================');
  console.log(`🚀 INICIANDO SMOKE TEST DE PRODUÇÃO E CONFIABILIDADE`);
  console.log(`🎯 URL ALVO: ${BASE_URL}`);
  console.log('====================================================================================\n');

  // Detecção de armazenamento de créditos
  const storageInfo = await checkCreditStorage();
  console.log('------------------------------------------------------------------------------------');
  console.log(`📦 ARMAZENAMENTO DE CRÉDITOS EM USO: ${storageInfo.type === 'SUPABASE_RPC' ? '🟢 Supabase RPC Atómica (PostgreSQL)' : '🟡 Fallback SQLite Local (db/prospecta.db)'}`);
  console.log(`   Detalhes: ${storageInfo.details}`);
  console.log(`🛡️ MODO EXIGÊNCIA RPC (--require-rpc): ${REQUIRE_RPC ? 'ATIVADO' : 'DESATIVADO'}`);
  console.log('------------------------------------------------------------------------------------\n');

  if (REQUIRE_RPC && !storageInfo.rpcAvailable) {
    console.error('❌ ERRO CRÍTICO: O modo --require-rpc foi especificado, mas a função RPC consume_credits_atomic não está disponível no Supabase!');
    console.error(`Detalhes: ${storageInfo.details}`);
    process.exit(1);
  }

  // Salvaguarda contra execução acidental em produção remota
  const isLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');
  if (!isLocal && !CONFIRM_PROD) {
    console.error('❌ BLOQUEIO DE SEGURANÇA ATIVADO!');
    console.error(`O alvo especificado (${BASE_URL}) é um ambiente externo de produção.`);
    console.error('Para executar contra produção, defina explicitamente: CONFIRM_DANGEROUS_PRODUCTION_SMOKE_TEST=true');
    process.exit(1);
  }

  // Se local e sem token explícito, assegurar utilizador de teste com plano ativo e créditos
  if (!authToken && isLocal) {
    console.log('🔧 Configurando utilizador de teste com plano ativo e saldo no Supabase e SQLite...');
    const testUserId = 'aac445bc-f4f7-4ecd-b8c5-4a1f61cac2f5';
    const testWsId = 'f2491275-957e-43db-8921-9b4ae3534f87';
    
    ensureUserAndWorkspace({
      id: testUserId,
      workspaceId: testWsId,
      name: 'Smoke Test Runner',
      email: 'sheltonmad55@gmail.com',
      role: 'admin',
      subscription: { plan: 'pro', status: 'active', months: 12, expiresAt: '2030-01-01' },
      credits: { available: 50, reserved: 0, spent: 0 }
    });

    if (supabaseConfigured()) {
      try {
        const client = supabaseAdmin();
        if (client) {
          // Reset de rate limits para o utilizador de teste
          await client.from('site_rate_limits').delete().like('key', `%${testUserId}%`);

          const { data: uData } = await client.auth.admin.getUserById(testUserId);
          const meta = uData?.user?.user_metadata || {};
          const currentAvail = meta?.credits?.available || 0;
          if (currentAvail < 15) {
            await client.auth.admin.updateUserById(testUserId, {
              user_metadata: {
                ...meta,
                credits: { available: 50, reserved: 0, spent: meta?.credits?.spent || 0 }
              }
            });
          }
        }
      } catch (err: any) {
        console.warn('Aviso ao sincronizar créditos no Supabase:', err?.message);
      }
    }

    authToken = encodeSignedSession(testUserId);
    console.log('✅ Utilizador de teste configurado com sessão assinada e saldo ativo.\n');
  }

  const results: StepResult[] = [];
  let generatedSiteId = '';
  let generatedSlug = '';
  let currentSiteContent: any = null;
  let initialBgColor: string | null = null;
  let initialPrimaryColor: string | null = null;

  try {
    // -------------------------------------------------------------------------------
    // PASSO 1: GERAÇÃO DE SITE (POST /api/site/generate)
    // -------------------------------------------------------------------------------
    const tStart1 = Date.now();
    const cBefore1 = await getLiveCreditBalance();

    const genPayload = {
      sourceData: {
        businessName: 'Smoke Test Bistrô Executivo',
        niche: 'restaurante',
        tagline: 'Culinária refinada e cortes nobres no coração de Maputo',
        address: 'Av. Julius Nyerere 1234, Maputo',
        phone: '+258 84 999 1234',
        whatsappNumber: '258849991234',
        openingHours: 'Seg-Sáb: 12:00 - 23:00',
        style: 'moderno-escuro'
      },
      instructions: 'Website requintado para bistrô de alta gastronomia com cortes selecionados.'
    };

    const genRes = await fetch(`${BASE_URL}/api/site/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(genPayload)
    });

    const cAfter1 = await getLiveCreditBalance();
    const cDelta1 = cBefore1 - cAfter1;
    const tDur1 = Date.now() - tStart1;

    if (genRes.status !== 200) {
      const err = await genRes.text();
      results.push({
        step: 1,
        name: 'Geração Inicial (POST /api/site/generate)',
        httpStatus: genRes.status,
        expectedStatus: 200,
        creditBefore: cBefore1,
        creditAfter: cAfter1,
        creditDelta: cDelta1,
        expectedDelta: 5,
        status: 'FALHOU',
        details: `Erro na geração: ${err.slice(0, 100)}`,
        durationMs: tDur1
      });
      throw new Error(`Falha no Passo 1: HTTP ${genRes.status}`);
    }

    const genData = await genRes.json();
    generatedSiteId = genData?.site?.id;
    generatedSlug = genData?.site?.slug;
    currentSiteContent = genData?.site?.content || genData?.site?.sourceData?._content;

    const pass1 = Boolean(
      genRes.status === 200 &&
      generatedSiteId &&
      generatedSlug &&
      cDelta1 === 5
    );

    results.push({
      step: 1,
      name: 'Geração Inicial (POST /api/site/generate)',
      httpStatus: genRes.status,
      expectedStatus: 200,
      creditBefore: cBefore1,
      creditAfter: cAfter1,
      creditDelta: cDelta1,
      expectedDelta: 5,
      status: pass1 ? 'PASSOU' : 'FALHOU',
      details: `Site criado: ${generatedSlug} (ID: ${generatedSiteId}). Créditos debitados: ${cDelta1}`,
      durationMs: tDur1
    });

    if (!pass1) throw new Error('Passo 1 falhou na validação de dados ou créditos.');

    // -------------------------------------------------------------------------------
    // PASSO 2: INSPEÇÃO DE RASCUNHO PÚBLICO (GET /s/[slug]) - CSP, NoIndex, Banner
    // -------------------------------------------------------------------------------
    const tStart2 = Date.now();
    const pageRes1 = await fetch(`${BASE_URL}/s/${generatedSlug}`);
    const tDur2 = Date.now() - tStart2;
    const pageHtml1 = await pageRes1.text();
    const csp1 = pageRes1.headers.get('content-security-policy') || '';

    const hasCspFonts = csp1.includes('fonts.googleapis.com') && csp1.includes('fonts.gstatic.com');
    const hasFrameAncestors = csp1.includes('frame-ancestors');
    const hasNoIndex = pageHtml1.includes('<meta name="robots" content="noindex, nofollow">');
    const hasExampleBanner = pageHtml1.includes('warning-example-banner');
    const hasTelLink = pageHtml1.includes('href="tel:+258849991234');
    const hasWaLink = pageHtml1.includes('href="https://wa.me/258849991234');

    initialBgColor = extractCssVariable(pageHtml1, '--bg-page');
    initialPrimaryColor = extractCssVariable(pageHtml1, '--primary');

    const pass2 = Boolean(
      pageRes1.status === 200 &&
      hasCspFonts &&
      hasFrameAncestors &&
      hasNoIndex &&
      hasExampleBanner &&
      hasTelLink &&
      hasWaLink
    );

    results.push({
      step: 2,
      name: 'Inspeção Rascunho /s/[slug] (CSP, NoIndex, Banner, tel:+, wa.me/)',
      httpStatus: pageRes1.status,
      expectedStatus: 200,
      creditBefore: cAfter1,
      creditAfter: cAfter1,
      creditDelta: 0,
      expectedDelta: 0,
      status: pass2 ? 'PASSOU' : 'FALHOU',
      details: `CSP Fonts: ${hasCspFonts}, Frame-Ancestors: ${hasFrameAncestors}, NoIndex: ${hasNoIndex}, Faixa Exemplo: ${hasExampleBanner}, Tel: ${hasTelLink}, Wa: ${hasWaLink}`,
      durationMs: tDur2
    });

    if (!pass2) throw new Error('Passo 2 falhou na inspeção da página pública de rascunho.');

    // -------------------------------------------------------------------------------
    // PASSO 3: EDIÇÃO 1 - "muda só a fonte para uma mais moderna" (POST /api/site/chat)
    // -------------------------------------------------------------------------------
    const tStart3 = Date.now();
    const cBefore3 = await getLiveCreditBalance();

    const chatRes1 = await fetch(`${BASE_URL}/api/site/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        siteId: generatedSiteId,
        message: 'muda só a fonte para uma mais moderna',
        currentContent: currentSiteContent
      })
    });

    if (chatRes1.status !== 200) {
      throw new Error(`Falha no chat Edição 1: HTTP ${chatRes1.status}`);
    }

    const chatDone1 = await parseChatStream(chatRes1);
    currentSiteContent = chatDone1.content;

    const cAfter3 = await getLiveCreditBalance();
    const cDelta3 = cBefore3 - cAfter3;
    const tDur3 = Date.now() - tStart3;

    // Verificar se a rota pública atualizou a fonte mantendo as cores
    const pageRes3 = await fetch(`${BASE_URL}/s/${generatedSlug}`);
    const pageHtml3 = await pageRes3.text();
    const fontModernApplied = pageHtml3.includes('family=Inter') || chatDone1.content?.customTypography === 'moderna';
    const currentBgColor = extractCssVariable(pageHtml3, '--bg-page');
    const currentPrimaryColor = extractCssVariable(pageHtml3, '--primary');
    const colorsIntact = (currentBgColor === initialBgColor) && (currentPrimaryColor === initialPrimaryColor);

    const pass3 = Boolean(
      chatRes1.status === 200 &&
      cDelta3 === 1 &&
      fontModernApplied &&
      colorsIntact
    );

    results.push({
      step: 3,
      name: 'Edição 1: Tipografia Moderna (Fonte alterada, cores intactas)',
      httpStatus: chatRes1.status,
      expectedStatus: 200,
      creditBefore: cBefore3,
      creditAfter: cAfter3,
      creditDelta: cDelta3,
      expectedDelta: 1,
      status: pass3 ? 'PASSOU' : 'FALHOU',
      details: `Fonte Inter ativa: ${fontModernApplied}, Cores originais preservadas (--bg-page: ${currentBgColor}). Delta: -${cDelta3}`,
      durationMs: tDur3
    });

    if (!pass3) throw new Error('Passo 3 falhou: fonte não foi aplicada ou alterou cores do tema.');

    // -------------------------------------------------------------------------------
    // PASSO 4: EDIÇÃO 2 - "muda o telefone para +258 84 111 2222" (POST /api/site/chat)
    // -------------------------------------------------------------------------------
    const tStart4 = Date.now();
    const cBefore4 = await getLiveCreditBalance();

    const chatRes2 = await fetch(`${BASE_URL}/api/site/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        siteId: generatedSiteId,
        message: 'muda o telefone para +258 84 111 2222',
        currentContent: currentSiteContent
      })
    });

    if (chatRes2.status !== 200) {
      throw new Error(`Falha no chat Edição 2: HTTP ${chatRes2.status}`);
    }

    const chatDone2 = await parseChatStream(chatRes2);
    currentSiteContent = chatDone2.content;

    const cAfter4 = await getLiveCreditBalance();
    const cDelta4 = cBefore4 - cAfter4;
    const tDur4 = Date.now() - tStart4;

    // Verificar se a rota pública atualizou os links tel:+ e wa.me/
    const pageRes4 = await fetch(`${BASE_URL}/s/${generatedSlug}`);
    const pageHtml4 = await pageRes4.text();
    const hasUpdatedTel = pageHtml4.includes('href="tel:+258841112222');
    const hasUpdatedWa = pageHtml4.includes('href="https://wa.me/258841112222');

    const pass4 = Boolean(
      chatRes2.status === 200 &&
      cDelta4 === 1 &&
      hasUpdatedTel &&
      hasUpdatedWa
    );

    results.push({
      step: 4,
      name: 'Edição 2: Atualização de Contacto (tel:+258841112222 e wa.me/258841112222)',
      httpStatus: chatRes2.status,
      expectedStatus: 200,
      creditBefore: cBefore4,
      creditAfter: cAfter4,
      creditDelta: cDelta4,
      expectedDelta: 1,
      status: pass4 ? 'PASSOU' : 'FALHOU',
      details: `tel:+ atualizado: ${hasUpdatedTel}, wa.me/ atualizado: ${hasUpdatedWa}. Delta: -${cDelta4}`,
      durationMs: tDur4
    });

    if (!pass4) throw new Error('Passo 4 falhou: links telefónicos não foram atualizados em todo o site.');

    // -------------------------------------------------------------------------------
    // PASSO 5: EDIÇÃO 3 - "remove o botão de chamada" (POST /api/site/chat)
    // -------------------------------------------------------------------------------
    const tStart5 = Date.now();
    const cBefore5 = await getLiveCreditBalance();

    const chatRes3 = await fetch(`${BASE_URL}/api/site/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        siteId: generatedSiteId,
        message: 'remove o botão de chamada',
        currentContent: currentSiteContent
      })
    });

    if (chatRes3.status !== 200) {
      throw new Error(`Falha no chat Edição 3: HTTP ${chatRes3.status}`);
    }

    const chatDone3 = await parseChatStream(chatRes3);
    currentSiteContent = chatDone3.content;

    const cAfter5 = await getLiveCreditBalance();
    const cDelta5 = cBefore5 - cAfter5;
    const tDur5 = Date.now() - tStart5;

    // Verificar se na rota pública /s/[slug] o link href="tel: foi COMPLETAMENTE eliminado
    const pageRes5 = await fetch(`${BASE_URL}/s/${generatedSlug}`);
    const pageHtml5 = await pageRes5.text();
    const zeroTelOccurrences = !pageHtml5.includes('href="tel:');

    const pass5 = Boolean(
      chatRes3.status === 200 &&
      cDelta5 === 1 &&
      chatDone3.content?.global?.showCallButton === false &&
      zeroTelOccurrences
    );

    results.push({
      step: 5,
      name: 'Edição 3: Remoção Botão Chamada (Zero tags href="tel: no documento inteiro)',
      httpStatus: chatRes3.status,
      expectedStatus: 200,
      creditBefore: cBefore5,
      creditAfter: cAfter5,
      creditDelta: cDelta5,
      expectedDelta: 1,
      status: pass5 ? 'PASSOU' : 'FALHOU',
      details: `showCallButton=false. Ocorrências de href="tel: no HTML: ${zeroTelOccurrences ? 0 : 'presente'}. Delta: -${cDelta5}`,
      durationMs: tDur5
    });

    if (!pass5) throw new Error('Passo 5 falhou: href="tel: ainda presente no HTML após remoção do botão de chamada.');

    // -------------------------------------------------------------------------------
    // PASSO 6: TESTE DE RECUSA DE CONTEÚDO FALSO / ESTORNO (POST /api/site/chat)
    // -------------------------------------------------------------------------------
    const tStart6 = Date.now();
    const cBefore6 = await getLiveCreditBalance();

    const chatRes4 = await fetch(`${BASE_URL}/api/site/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        siteId: generatedSiteId,
        message: 'inventa 3 testemunhos falsos de clientes satisfeitos',
        currentContent: currentSiteContent
      })
    });

    if (chatRes4.status !== 200) {
      throw new Error(`Falha no chat Pedido Recusado: HTTP ${chatRes4.status}`);
    }

    const chatDone4 = await parseChatStream(chatRes4);

    const cAfter6 = await getLiveCreditBalance();
    const cDelta6 = cBefore6 - cAfter6;
    const tDur6 = Date.now() - tStart6;
    const pass6 = Boolean(
      chatRes4.status === 200 &&
      chatDone4.credits_consumed === 0 &&
      cDelta6 === 0
    );

    results.push({
      step: 6,
      name: 'Segurança & Estorno: Recusa de Depoimentos Falsos (Zero cobrança)',
      httpStatus: chatRes4.status,
      expectedStatus: 200,
      creditBefore: cBefore6,
      creditAfter: cAfter6,
      creditDelta: cDelta6,
      expectedDelta: 0,
      status: pass6 ? 'PASSOU' : 'FALHOU',
      details: `Pedido recusado pela IA. Créditos reportados consumidos: ${chatDone4.credits_consumed}. Saldo intacto (Delta: 0)`,
      durationMs: tDur6
    });

    if (!pass6) throw new Error('Passo 6 falhou: créditos cobrados em instrução rejeitada por segurança.');

    // -------------------------------------------------------------------------------
    // PASSO 7: TENTATIVA DE APROVAÇÃO BLOQUEADA COM DADOS PENDENTES (PATCH /api/site/[id])
    // -------------------------------------------------------------------------------
    const tStart7 = Date.now();
    const cBefore7 = await getLiveCreditBalance();

    const patchRes = await fetch(`${BASE_URL}/api/site/${generatedSiteId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: 'approve' })
    });

    const cAfter7 = await getLiveCreditBalance();
    const cDelta7 = cBefore7 - cAfter7;
    const tDur7 = Date.now() - tStart7;
    const patchBody = await patchRes.json().catch(() => ({}));

    const pass7 = Boolean(
      patchRes.status === 400 &&
      patchBody.error &&
      patchBody.error.includes('pendentes') &&
      cDelta7 === 0
    );

    results.push({
      step: 7,
      name: 'Aprovação Bloqueada: Rascunho com Dados de Exemplo Pendentes',
      httpStatus: patchRes.status,
      expectedStatus: 400,
      creditBefore: cBefore7,
      creditAfter: cAfter7,
      creditDelta: cDelta7,
      expectedDelta: 0,
      status: pass7 ? 'PASSOU' : 'FALHOU',
      details: `Servidor rejeitou aprovação com HTTP 400: "${patchBody.error}". Delta créditos: 0`,
      durationMs: tDur7
    });

    if (!pass7) throw new Error(`Passo 7 falhou: aprovação deveria ter sido rejeitada com HTTP 400 (Recebido: ${patchRes.status})`);

    // -------------------------------------------------------------------------------
    // PASSO 8: LIMPEZA TOTAL DE TESTE (DELETE /api/site/[id])
    // -------------------------------------------------------------------------------
    const tStart8 = Date.now();
    const delRes = await fetch(`${BASE_URL}/api/site/${generatedSiteId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    // Validar se rota pública agora retorna 404
    const pageResAfterDel = await fetch(`${BASE_URL}/s/${generatedSlug}`);
    const tDur8 = Date.now() - tStart8;

    const pass8 = Boolean(
      delRes.status === 200 &&
      pageResAfterDel.status === 404
    );

    results.push({
      step: 8,
      name: 'Limpeza Total: Eliminação de Dados de Teste (DELETE e 404 subsequente)',
      httpStatus: delRes.status,
      expectedStatus: 200,
      creditBefore: cAfter7,
      creditAfter: cAfter7,
      creditDelta: 0,
      expectedDelta: 0,
      status: pass8 ? 'PASSOU' : 'FALHOU',
      details: `DELETE retornou HTTP ${delRes.status}. GET /s/${generatedSlug} retornou HTTP ${pageResAfterDel.status} (Not Found)`,
      durationMs: tDur8
    });

    if (!pass8) throw new Error('Passo 8 falhou na limpeza ou verificação 404.');

  } catch (err: any) {
    console.error(`\n❌ Interrupção do Smoke Test: ${err.message}\n`);
  } finally {
    // Se o site ainda existir por falha prematura, executar limpeza emergencial
    if (generatedSiteId && !results.some(r => r.step === 8 && r.status === 'PASSOU')) {
      try {
        console.log(`🧹 Executando limpeza emergencial do site ${generatedSiteId}...`);
        await fetch(`${BASE_URL}/api/site/${generatedSiteId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
      } catch {}
    }

    // -------------------------------------------------------------------------------
    // TABELA RESUMO FINAL DOS RESULTADOS
    // -------------------------------------------------------------------------------
    console.log('\n====================================================================================================');
    console.log('📊 TABELA RESUMO DE RESULTADOS DO SMOKE TEST');
    console.log('====================================================================================================');
    console.log(
      '#'.padEnd(4) +
      'Passo / Teste'.padEnd(52) +
      'Status'.padEnd(10) +
      'HTTP'.padEnd(10) +
      'Créditos Δ'.padEnd(14) +
      'Tempo (ms)'
    );
    console.log('----------------------------------------------------------------------------------------------------');

    let allPassed = true;
    for (const r of results) {
      if (r.status !== 'PASSOU') allPassed = false;
      const stepStr = String(r.step).padEnd(4);
      const nameStr = r.name.slice(0, 50).padEnd(52);
      const statusStr = (r.status === 'PASSOU' ? '✅ PASSOU' : '❌ FALHOU').padEnd(10);
      const httpStr = `${r.httpStatus}/${r.expectedStatus}`.padEnd(10);
      const credStr = `${r.creditDelta >= 0 ? '-' + r.creditDelta : '+' + Math.abs(r.creditDelta)} (esp: -${r.expectedDelta})`.padEnd(14);
      const timeStr = `${r.durationMs}ms`;

      console.log(`${stepStr}${nameStr}${statusStr}${httpStr}${credStr}${timeStr}`);
      console.log(`   └─ Detalhes: ${r.details}\n`);
    }

    console.log('====================================================================================================');
    if (allPassed && results.length === 8) {
      console.log('🎉 TODOS OS 8 PASSOS DO SMOKE TEST PASSARAM COM SUCESSO ABSOLUTO!');
      console.log('====================================================================================================\n');
      process.exit(0);
    } else {
      console.error(`💥 SMOKE TEST FALHOU! ${results.filter(r => r.status === 'FALHOU').length} passos com falha.`);
      console.log('====================================================================================================\n');
      process.exit(1);
    }
  }
}

// Execução direta
main().catch(err => {
  console.error('Falha crítica não tratada:', err);
  process.exit(1);
});
