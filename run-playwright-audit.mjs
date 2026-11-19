import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runQualityAudit() {
  console.log('--- Iniciando Auditoria de Rota Real com Playwright ---');
  const browser = await chromium.launch({ headless: true });

  // 1. Inspecionar Cabeçalhos HTTP e CSP na Rota Real /s/route-test-clinica
  const context = await browser.newContext();
  const page = await context.newPage();

  let cspHeader = '';
  let responseStatus = 0;
  const consoleLogs = [];

  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  const response = await page.goto('http://127.0.0.1:4317/s/route-test-clinica', { waitUntil: 'networkidle' });
  responseStatus = response.status();
  const headers = response.headers();
  cspHeader = headers['content-security-policy'] || '';

  console.log(`[Status HTTP]: ${responseStatus}`);
  console.log(`[CSP Header]: ${cspHeader}`);

  await context.close();

  // 2. Capturar os 3 Nichos em Mobile (390px) e Desktop (1280px)
  const niches = [
    { slug: 'route-test-clinica', name: 'clinica' },
    { slug: 'route-test-salao', name: 'salao' },
    { slug: 'route-test-restaurante', name: 'restaurante' }
  ];

  for (const n of niches) {
    // Desktop 1280px
    const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pageDesktop = await ctxDesktop.newPage();
    await pageDesktop.goto(`http://127.0.0.1:4317/s/${n.slug}`, { waitUntil: 'networkidle' });
    const deskPath = path.join(SCREENSHOT_DIR, `${n.name}-1280px.png`);
    await pageDesktop.screenshot({ path: deskPath, fullPage: false });
    console.log(`[Screenshot Salvo]: ${deskPath}`);
    await ctxDesktop.close();

    // Mobile 390px
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const pageMobile = await ctxMobile.newPage();
    await pageMobile.goto(`http://127.0.0.1:4317/s/${n.slug}`, { waitUntil: 'networkidle' });
    const mobPath = path.join(SCREENSHOT_DIR, `${n.name}-390px.png`);
    await pageMobile.screenshot({ path: mobPath, fullPage: false });
    console.log(`[Screenshot Salvo]: ${mobPath}`);
    await ctxMobile.close();
  }

  // 3. Capturar os 6 Temas em Desktop (1280px) para comprovar a variedade de layouts
  const themes = [
    { slug: 'theme-odontoart', name: '01-odontoart-champagne' },
    { slug: 'theme-prodente', name: '02-prodente-navy-cyan' },
    { slug: 'theme-yessir', name: '03-yessir-green-gold' },
    { slug: 'theme-vitalmed', name: '04-vitalmed-blue' },
    { slug: 'theme-dentalhome', name: '05-dentalhome-royal' },
    { slug: 'theme-dentalcare', name: '06-dentalcare-emerald' }
  ];

  for (const t of themes) {
    const ctxTheme = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pageTheme = await ctxTheme.newPage();
    await pageTheme.goto(`http://127.0.0.1:4317/s/${t.slug}`, { waitUntil: 'networkidle' });
    const themePath = path.join(SCREENSHOT_DIR, `${t.name}-hero-desktop.png`);
    await pageTheme.screenshot({ path: themePath, fullPage: false });
    console.log(`[Screenshot Tema Salvo]: ${themePath}`);
    await ctxTheme.close();
  }

  await browser.close();
  console.log('--- Auditoria Concluída com Sucesso ---');
}

runQualityAudit().catch(err => {
  console.error('[Erro na Auditoria]:', err);
  process.exit(1);
});

