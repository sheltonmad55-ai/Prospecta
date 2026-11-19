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
import { db } from '../src/server/db.ts';
import { ensureUserAndWorkspace, encodeSignedSession } from '../src/server/auth.ts';

const TEST_USER_ID = 'aac445bc-f4f7-4ecd-b8c5-4a1f61cac2f5';
const TEST_WS_ID = 'f2491275-957e-43db-8921-9b4ae3534f87';
const OUT_DIR = path.resolve(process.cwd(), 'test-screenshots', 'mobile-audit');

async function capture() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

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
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });

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

  const pages = [
    { name: '01-search', url: 'http://127.0.0.1:4317/?view=search' },
    { name: '02-leads', url: 'http://127.0.0.1:4317/?view=leads' },
    { name: '03-outreach', url: 'http://127.0.0.1:4317/?view=outreach&business=biz-c9cbb5a2372f58d4' },
    { name: '04-daily', url: 'http://127.0.0.1:4317/?view=daily' },
    { name: '05-vault', url: 'http://127.0.0.1:4317/?view=vault' },
    { name: '06-integrations', url: 'http://127.0.0.1:4317/?view=integrations' },
    { name: '07-profile', url: 'http://127.0.0.1:4317/?view=profile' },
    { name: '08-create-site', url: 'http://127.0.0.1:4317/?view=create-site' }
  ];

  for (const p of pages) {
    console.log(`Carregando ${p.name}...`);
    await page.goto(p.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT_DIR, `${p.name}-390px.png`), fullPage: false });
  }

  // Capturar também menu mobile aberto
  console.log('Capturando menu mobile aberto...');
  await page.goto('http://127.0.0.1:4317/?view=search', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const menuBtn = page.locator('button[aria-label="Abrir menu"]').first();
  if (await menuBtn.isVisible()) {
    await menuBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, '00-mobile-sidebar-open-390px.png'), fullPage: false });
  }

  await browser.close();
  console.log('Capturas salvas em test-screenshots/mobile-audit');
}

capture().catch(console.error);
