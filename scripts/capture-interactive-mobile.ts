import fs from 'node:fs';
import path from 'node:path';

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
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import { chromium } from '@playwright/test';
import { encodeSignedSession } from '../src/server/auth.ts';

const tok = encodeSignedSession('aac445bc-f4f7-4ecd-b8c5-4a1f61cac2f5');
const OUT_DIR = path.resolve(process.cwd(), 'test-screenshots', 'mobile-audit');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addCookies([{ name: 'prospecta_session', value: tok, domain: '127.0.0.1', path: '/' }]);
  await ctx.addInitScript((t) => window.localStorage.setItem('prospecta_session_token', t), tok);
  const page = await ctx.newPage();

  console.log('1. Acessando Busca...');
  await page.goto('http://127.0.0.1:4317/?view=search');
  await page.waitForSelector('.radar-search-panel', { timeout: 10000 });
  await page.screenshot({ path: path.join(OUT_DIR, '01-search-loaded-390px.png') });

  console.log('2. Realizando busca por Dentista...');
  const queryInput = page.locator('.radar-search-panel input').first();
  await queryInput.fill('Dentista');
  const searchBtn = page.locator('button.radar-submit-button');
  await searchBtn.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT_DIR, '01-search-results-390px.png') });

  console.log('3. Acessando Preparar Abordagem com empresa real...');
  await page.goto('http://127.0.0.1:4317/?view=outreach&business=biz-c9cbb5a2372f58d4');
  await page.waitForSelector('.outreach-grid', { timeout: 10000 });
  await page.screenshot({ path: path.join(OUT_DIR, '03-outreach-loaded-390px.png') });

  await browser.close();
  console.log('Capturas adicionais concluídas com sucesso.');
}

run().catch(console.error);
