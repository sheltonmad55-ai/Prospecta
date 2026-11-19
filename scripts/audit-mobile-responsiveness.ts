import fs from 'node:fs';
import path from 'node:path';

// Carregar .env.local
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

const TEST_USER_ID = 'aac445bc-f4f7-4ecd-b8c5-4a1f61cac2f5';
const TEST_WS_ID = 'f2491275-957e-43db-8921-9b4ae3534f87';

async function audit() {
  console.log('--- INICIANDO AUDITORIA MOBILE DE RESPONSIVIDADE ---');
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
  const viewports = [
    { name: 'iPhone (390px)', width: 390, height: 844 },
    { name: 'Small Android (360px)', width: 360, height: 740 }
  ];

  const results: any[] = [];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
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

    const targets = [
      { name: 'Landing (deslogado)', url: 'http://127.0.0.1:4317', unauth: true },
      { name: 'Login', url: 'http://127.0.0.1:4317/login', unauth: true },
      { name: 'Busca / Radar', url: 'http://127.0.0.1:4317/?view=search' },
      { name: 'CRM / Leads', url: 'http://127.0.0.1:4317/?view=leads' },
      { name: 'Preparar Abordagem', url: 'http://127.0.0.1:4317/?view=outreach&business=biz-c9cbb5a2372f58d4' },
      { name: 'Oportunidades Hoje', url: 'http://127.0.0.1:4317/?view=daily' },
      { name: 'Cofre de Vendas', url: 'http://127.0.0.1:4317/?view=vault' },
      { name: 'Integrações WhatsApp', url: 'http://127.0.0.1:4317/?view=integrations' },
      { name: 'Configurações / Perfil', url: 'http://127.0.0.1:4317/?view=profile' },
      { name: 'Criar Site', url: 'http://127.0.0.1:4317/?view=create-site' }
    ];

    for (const target of targets) {
      if (target.unauth) {
        await context.clearCookies();
        await page.addInitScript(() => {
          window.localStorage.removeItem('prospecta_session_token');
        });
      } else {
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
        await page.addInitScript((tok) => {
          window.localStorage.setItem('prospecta_session_token', tok);
        }, sessionToken);
      }

      await page.goto(target.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const auditData = await page.evaluate((vpWidth) => {
        const bodyScrollWidth = document.body.scrollWidth;
        const htmlScrollWidth = document.documentElement.scrollWidth;
        const windowWidth = window.innerWidth;
        const hasHorizontalOverflow = bodyScrollWidth > windowWidth || htmlScrollWidth > windowWidth;

        // Encontrar elementos que transbordam horizontalmente
        const overflowingElements: any[] = [];
        const allElements = document.querySelectorAll('*');
        for (const el of Array.from(allElements)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.right > windowWidth + 1) {
            // pegar seletor identificável
            const tag = el.tagName.toLowerCase();
            const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '';
            const id = el.id ? '#' + el.id : '';
            const overflowAmount = Math.round(rect.right - windowWidth);
            overflowingElements.push({
              selector: `${tag}${id}${cls}`,
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              overflow: overflowAmount
            });
          }
        }

        // Encontrar inputs com font-size < 16px (evitar zoom indesejado em iOS Safari)
        const inputsUnder16px: any[] = [];
        const inputs = document.querySelectorAll('input, select, textarea');
        for (const inp of Array.from(inputs)) {
          const style = window.getComputedStyle(inp);
          const fSize = parseFloat(style.fontSize);
          if (fSize < 16) {
            const tag = inp.tagName.toLowerCase();
            const cls = typeof inp.className === 'string' && inp.className ? '.' + inp.className.trim().split(/\s+/).join('.') : '';
            inputsUnder16px.push({
              selector: `${tag}${cls}`,
              fontSize: style.fontSize
            });
          }
        }

        // Encontrar botões/links com toque menor que 36px/40px
        const smallTouchTargets: any[] = [];
        const interactive = document.querySelectorAll('button, a.button, .tab-bar > button, .nav-item');
        for (const btn of Array.from(interactive)) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && (rect.height < 36 || rect.width < 36)) {
            const text = (btn.textContent || '').trim().slice(0, 25);
            smallTouchTargets.push({
              text,
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            });
          }
        }

        return {
          windowWidth,
          bodyScrollWidth,
          htmlScrollWidth,
          hasHorizontalOverflow,
          overflowingCount: overflowingElements.length,
          topOverflowing: overflowingElements.slice(0, 5),
          inputsUnder16pxCount: inputsUnder16px.length,
          inputsUnder16pxSample: inputsUnder16px.slice(0, 3),
          smallTouchTargetsCount: smallTouchTargets.length,
          smallTouchTargetsSample: smallTouchTargets.slice(0, 5)
        };
      }, vp.width);

      results.push({
        viewport: vp.name,
        target: target.name,
        ...auditData
      });
    }

    await context.close();
  }

  await browser.close();

  console.log('\n--- RESULTADOS DA AUDITORIA ---');
  for (const r of results) {
    const status = r.hasHorizontalOverflow ? '❌ OVERFLOW' : '✅ OK';
    console.log(`[${r.viewport}] ${r.target.padEnd(25)}: ${status} (body: ${r.bodyScrollWidth}px / vp: ${r.windowWidth}px, ${r.overflowingCount} elementos transbordando, ${r.inputsUnder16pxCount} inputs < 16px, ${r.smallTouchTargetsCount} alvos pequenos)`);
    if (r.hasHorizontalOverflow && r.topOverflowing.length > 0) {
      console.log(`   Transbordando:`, JSON.stringify(r.topOverflowing));
    }
  }

  fs.writeFileSync('test-results/audit-mobile.json', JSON.stringify(results, null, 2));
  console.log('Salvo em test-results/audit-mobile.json');
}

audit().catch(console.error);
