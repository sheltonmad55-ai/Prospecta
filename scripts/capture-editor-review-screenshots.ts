import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-screenshots', 'review-items');
const BRAIN_SCREENSHOT_DIR = 'C:/Users/shelt/.gemini/antigravity/brain/1d5fd208-ec40-4e4a-961d-3bec9d24327e/screenshots/review-items';

async function capture() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(BRAIN_SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Navigating to http://127.0.0.1:4317/test-editor-preview at 390px...');
  await page.goto('http://127.0.0.1:4317/test-editor-preview', { waitUntil: 'networkidle' });

  // 1. Clicar na aba "Elementos & Secções"
  console.log('Switching to "Elementos & Secções" tab...');
  await page.click('button:has-text("Elementos & Secções")');
  await page.waitForTimeout(500);

  // Captura 1: Lista item por item com botões Confirmar e Editar e checkbox desligado
  const file1 = 'teste-review-1-lista-itens-390px.png';
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, file1) });
  fs.copyFileSync(path.join(SCREENSHOT_DIR, file1), path.join(BRAIN_SCREENSHOT_DIR, file1));
  console.log(`✅ Captura 1 salva: ${file1}`);

  // 2. Clicar em "Editar" no primeiro item
  console.log('Clicking "✏️ Editar" on first item...');
  const editButtons = await page.$$('button:has-text("Editar")');
  if (editButtons.length > 0) {
    await editButtons[0].click();
    await page.waitForTimeout(300);
  }

  // Captura 2: Modo de edição inline ativo
  const file2 = 'teste-review-2-edicao-inline-390px.png';
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, file2) });
  fs.copyFileSync(path.join(SCREENSHOT_DIR, file2), path.join(BRAIN_SCREENSHOT_DIR, file2));
  console.log(`✅ Captura 2 salva: ${file2}`);

  // Cancelar edição para voltar ao estado normal
  await page.click('button:has-text("Cancelar")');
  await page.waitForTimeout(300);

  // 3. Marcar checkbox "Verifiquei que estes dados são reais..."
  console.log('Checking confirmation checkbox...');
  await page.check('input[type="checkbox"]:near(:text("Verifiquei que estes dados"))');
  await page.waitForTimeout(300);

  // Captura 3: Checkbox ativo e botão "Confirmar todos" habilitado
  const file3 = 'teste-review-3-checkbox-ativo-390px.png';
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, file3) });
  fs.copyFileSync(path.join(SCREENSHOT_DIR, file3), path.join(BRAIN_SCREENSHOT_DIR, file3));
  console.log(`✅ Captura 3 salva: ${file3}`);

  await browser.close();
  console.log('Todas as capturas geradas com sucesso!');
}

capture().catch(err => {
  console.error('Falha na captura:', err);
  process.exit(1);
});

