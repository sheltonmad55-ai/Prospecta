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

import { chromium } from '@playwright/test';
import { db } from '../src/server/db.ts';
import { ensureUserAndWorkspace, encodeSignedSession } from '../src/server/auth.ts';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-screenshots', 'real-app');
const BRAIN_SCREENSHOT_DIR = 'C:/Users/shelt/.gemini/antigravity/brain/1d5fd208-ec40-4e4a-961d-3bec9d24327e/screenshots/real-app';

const TEST_USER_ID = 'aac445bc-f4f7-4ecd-b8c5-4a1f61cac2f5';
const TEST_WS_ID = 'f2491275-957e-43db-8921-9b4ae3534f87';

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(BRAIN_SCREENSHOT_DIR, { recursive: true });

  console.log('1. Garantindo utilizador de teste no SQLite com plano ativo e onboarded...');
  ensureUserAndWorkspace({
    id: TEST_USER_ID,
    workspaceId: TEST_WS_ID,
    name: 'Shelton - Prospecta Admin',
    email: 'sheltonmad55@gmail.com',
    role: 'admin',
    subscription: { plan: 'pro', status: 'active', months: 12, expiresAt: '2030-01-01' },
    credits: { available: 50, reserved: 0, spent: 0 }
  });

  db().prepare(`
    UPDATE workspaces 
    SET profile = json_set(COALESCE(profile, '{}'), '$.onboarded', true)
    WHERE user_id = ?
  `).run(TEST_USER_ID);

  const sessionToken = encodeSignedSession(TEST_USER_ID);
  console.log('✅ Sessão assinada gerada.');

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: '1280px', width: 1280, height: 800 },
    { name: '390px', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    console.log(`\n========================================================================`);
    console.log(`📸 INICIANDO CAPTURAS NA APLICAÇÃO REAL (${vp.name})`);
    console.log(`========================================================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });

    // Injetar token de autenticação tanto no cookie quanto no localStorage
    await context.addInitScript((tok) => {
      window.localStorage.setItem('prospecta_session_token', tok);
    }, sessionToken);

    await context.addCookies([
      {
        name: 'prospecta_session',
        value: sessionToken,
        domain: '127.0.0.1',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax'
      }
    ]);

    const page = await context.newPage();

    console.log(`Navegando para http://127.0.0.1:4317/?view=create-site...`);
    await page.goto('http://127.0.0.1:4317/?view=create-site', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Clicar na aba "Meus Sites Gerados"
    console.log(`Clicando na aba "Meus Sites Gerados"...`);
    const historyTab = page.locator('button:has-text("Meus Sites Gerados")');
    await historyTab.waitFor({ state: 'visible', timeout: 5000 });
    await historyTab.click();
    await page.waitForTimeout(800);

    // Clicar em "✨ Editor IA" no card do site gerado
    console.log(`Abrindo o Editor IA no card do site gerado...`);
    const editorBtn = page.locator('button:has-text("✨ Editor IA")').first();
    await editorBtn.waitFor({ state: 'visible', timeout: 5000 });
    await editorBtn.click();
    await page.waitForTimeout(1200);

    // Captura A: Editor com chat aberto ("💬 Editar com IA")
    console.log(`Capturando: a) Editor com chat aberto...`);
    const fileA = `real-app-a-chat-${vp.name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileA) });
    fs.copyFileSync(path.join(SCREENSHOT_DIR, fileA), path.join(BRAIN_SCREENSHOT_DIR, fileA));
    console.log(`✅ Salvo: ${fileA}`);

    // Mudar para aba "Elementos e secções"
    console.log(`Alternando para a aba "Elementos e secções"...`);
    const elementsTab = page.locator('button:has-text("Elementos e secções")');
    await elementsTab.click();
    await page.waitForTimeout(800);

    // Captura B: Painel "Elementos e secções" com lista de dados de exemplo bem formatada
    console.log(`Capturando: b) Painel Elementos e secções com lista de dados de exemplo...`);
    const fileB = `real-app-b-elementos-lista-${vp.name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileB) });
    fs.copyFileSync(path.join(SCREENSHOT_DIR, fileB), path.join(BRAIN_SCREENSHOT_DIR, fileB));
    console.log(`✅ Salvo: ${fileB}`);

    // Clicar em "✏️ Editar" no primeiro item da lista de revisão
    console.log(`Clicando em "✏️ Editar" no primeiro item da lista...`);
    const editBtn = page.locator('button:has-text("✏️")').first();
    await editBtn.waitFor({ state: 'visible', timeout: 5000 });
    await editBtn.click();
    await page.waitForTimeout(600);

    // Captura C: Item em edição inline (campo aberto com botões Gravar/Salvar e Cancelar)
    console.log(`Capturando: c) Item em edição inline com botões...`);
    const fileC = `real-app-c-item-edicao-${vp.name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileC) });
    fs.copyFileSync(path.join(SCREENSHOT_DIR, fileC), path.join(BRAIN_SCREENSHOT_DIR, fileC));
    console.log(`✅ Salvo: ${fileC}`);

    // Cancelar edição para voltar ao estado com checkbox
    console.log(`Clicando em "Cancelar" para fechar o modo de edição inline...`);
    const cancelBtn = page.locator('button:has-text("Cancelar")').first();
    await cancelBtn.waitFor({ state: 'visible', timeout: 5000 });
    await cancelBtn.click();
    await page.waitForTimeout(400);

    // Marcar checkbox "Verifiquei que estes dados são reais e correspondem à minha empresa"
    console.log(`Marcando checkbox de confirmação de dados reais...`);
    const confirmCheckbox = page.locator('input[type="checkbox"]:near(:text("Verifiquei que estes dados"))');
    await confirmCheckbox.waitFor({ state: 'visible', timeout: 5000 });
    await confirmCheckbox.check();
    await page.waitForTimeout(400);

    // Captura D: Checkbox assinalado e botão "Confirmar todos" ativo
    console.log(`Capturando: d) Checkbox assinalado e botão Confirmar todos ativo...`);
    const fileD = `real-app-d-checkbox-confirmar-${vp.name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileD) });
    fs.copyFileSync(path.join(SCREENSHOT_DIR, fileD), path.join(BRAIN_SCREENSHOT_DIR, fileD));
    console.log(`✅ Salvo: ${fileD}`);

    // Captura E: Prévia com a faixa de aviso enquanto há dados pendentes
    console.log(`Capturando: e) Prévia com faixa de aviso...`);
    if (vp.name === '1280px') {
      // No desktop (1280px), a prévia está no iframe ao lado do painel do editor
      const fileE = `real-app-e-previa-faixa-1280px.png`;
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileE) });
      fs.copyFileSync(path.join(SCREENSHOT_DIR, fileE), path.join(BRAIN_SCREENSHOT_DIR, fileE));
      console.log(`✅ Salvo: ${fileE}`);
    } else {
      // No mobile (390px), abrir a rota real /s/[slug] para mostrar a faixa e o site em modo mobile
      const slugMatch = await page.locator('span:has-text("/s/")').first().innerText().catch(() => '/s/smoke-test-bistro-execut-dafd26c5c262');
      const cleanSlug = slugMatch.replace(/^\/s\//, '').trim() || 'smoke-test-bistro-execut-dafd26c5c262';
      
      const previewPage = await context.newPage();
      await previewPage.goto(`http://127.0.0.1:4317/s/${cleanSlug}`, { waitUntil: 'networkidle' });
      await previewPage.waitForTimeout(500);
      const fileE = `real-app-e-previa-faixa-390px.png`;
      await previewPage.screenshot({ path: path.join(SCREENSHOT_DIR, fileE) });
      fs.copyFileSync(path.join(SCREENSHOT_DIR, fileE), path.join(BRAIN_SCREENSHOT_DIR, fileE));
      console.log(`✅ Salvo: ${fileE}`);
      await previewPage.close();
    }

    await context.close();
  }

  await browser.close();
  console.log('\n🎉 Todas as capturas na aplicação real foram geradas com sucesso!');
}

run().catch(err => {
  console.error('Erro na execução das capturas:', err);
  process.exit(1);
});