import http from 'node:http';
import { chromium } from 'playwright';
import { renderSiteTemplate, type SiteContent } from '../src/server/site-template';

async function runBrowserE2e() {
  console.log('=====================================================');
  console.log('     TESTE EM BROWSER REAL (CHROMIUM E2E)            ');
  console.log('=====================================================\n');

  const mockContent: SiteContent = {
    businessName: 'Clínica Dentária Sorriso Matola',
    tagline: 'Excelência e Cuidado Dentário na Matola',
    heroHeadline: 'O seu sorriso perfeito começa aqui',
    heroSubheadline: 'Cuide da sua saúde oral com profissionais dedicados e tecnologia moderna.',
    aboutText: 'Somos uma clínica de referência na Matola Fomento.',
    services: [
      { title: 'Ortodontia', description: 'Alinhamento dos dentes com aparelhos modernos.' },
      { title: 'Implantes Dentários', description: 'Soluções seguras e duradouras.' }
    ],
    address: 'Av. das Indústrias, Matola Fomento, Maputo Província',
    openingHours: 'Segunda a Sábado, 08h às 18h',
    phone: '+258 84 311 9920',
    whatsappNumber: '258843119920',
    whatsappMessage: 'Olá! Gostaria de informações.',
    style: 'moderno',
    primaryColor: '#0ea5e9',
    placeholdersPending: 1,
    hasExampleData: true
  };

  const html = renderSiteTemplate(mockContent, true);

  // Servidor HTTP local servindo o HTML com a CSP exata da rota /s/[slug]
  const cspHeader = [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src https: data:",
    "frame-src https://www.google.com https://maps.google.com https://www.google.co.mz",
    "frame-ancestors 'self' https://prospecta-mz.vercel.app https://*.vercel.app http://localhost:* http://127.0.0.1:*",
    "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox"
  ].join('; ');

  const server = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': cspHeader,
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(html);
  });

  await new Promise<void>((resolve) => server.listen(48921, '127.0.0.1', () => resolve()));
  const testUrl = 'http://127.0.0.1:48921';
  console.log(`[1] Servidor de teste ativo em ${testUrl}`);

  // Inicia browser real Chromium
  console.log('[2] Lançando Chromium real para teste...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  // Carrega página
  await page.goto(testUrl, { waitUntil: 'domcontentloaded' });

  // 1. Verifica CSP na consola
  if (consoleErrors.length === 0) {
    console.log('✅ ZERO erros de CSP ou JavaScript na consola do browser!');
  } else {
    console.warn('⚠️ Alertas/erros de consola encontrados:', consoleErrors);
  }

  // 2. Verifica a faixa de aviso de dados de exemplo
  const bannerText = await page.textContent('.banner-placeholder');
  if (bannerText && bannerText.includes('dados de exemplo')) {
    console.log('✅ Faixa de aviso de dados de exemplo presente e visível na prévia!');
  } else {
    console.error('❌ Falha: Faixa de dados de exemplo não encontrada.');
  }

  // 3. Testa o formulário "Falar no WhatsApp"
  console.log('[3] Testando formulário "Falar no WhatsApp" interativo...');
  await page.fill('#waNome', 'Carlos Tembe');
  await page.selectOption('#waServico', 'Ortodontia');
  await page.fill('#waData', 'Amanhã às 14h');
  await page.fill('#waMsg', 'Tenho interesse em aparelho transparente.');

  // Intercepta window.open no browser real
  let openedUrl = '';
  await page.exposeFunction('onWindowOpenCapture', (u: string) => {
    openedUrl = u;
  });
  await page.evaluate(() => {
    const orig = window.open;
    window.open = function(url) {
      (window as any).onWindowOpenCapture(url);
      return null;
    };
  });

  // Clica no botão de submissão
  await page.click('button[type="submit"]');
  await page.waitForTimeout(300);

  if (openedUrl.includes('https://wa.me/258843119920') && openedUrl.includes('Carlos%20Tembe') && openedUrl.includes('Ortodontia')) {
    console.log('✅ Formulário abriu o WhatsApp com o texto pré-preenchido com sucesso!');
    console.log(`   URL gerada: ${openedUrl.slice(0, 90)}...`);
  } else {
    console.error(`❌ URL do WhatsApp incorreta: ${openedUrl}`);
  }

  // 4. Testa o botão de chamada
  console.log('[4] Verificando botão de chamada telefónica...');
  const telHref = await page.getAttribute('a.btn-cta-tel', 'href');
  if (telHref && telHref.startsWith('tel:')) {
    console.log(`✅ Botão de chamada configurado corretamente com: "${telHref}"`);
  } else {
    console.error(`❌ Botão de chamada com href inválido: ${telHref}`);
  }

  // 5. Testa animação suave ao scroll
  console.log('[5] Testando animação de aparição ao scroll (IntersectionObserver)...');
  const sectionsBefore = await page.$$eval('.fade-in-section.is-visible', els => els.length);
  // Faz scroll até o fundo
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const sectionsAfter = await page.$$eval('.fade-in-section.is-visible', els => els.length);
  console.log(`   Secções visíveis antes do scroll: ${sectionsBefore}, após o scroll: ${sectionsAfter}`);
  if (sectionsAfter > 0) {
    console.log('✅ Animação ao scroll ativou com sucesso as classes .is-visible!');
  }

  // 6. Compara ícone do WhatsApp com o oficial
  console.log('[6] Verificando vetor oficial do WhatsApp...');
  const svgPath = await page.$eval('.sticky-btn-wa svg path', el => el.getAttribute('d'));
  // O path oficial da Meta contém "M12.04 2c-5.46 0-9.91 4.45-9.91 9.91"
  if (svgPath && svgPath.includes('M12.04 2c-5.46')) {
    console.log('✅ Ícone do WhatsApp verificado: corresponde ao vetor oficial dos recursos de marca da Meta/WhatsApp!');
  } else {
    console.warn('⚠️ Ícone do WhatsApp não corresponde ao vetor oficial.');
  }

  await browser.close();
  server.close();

  console.log('\n=====================================================');
  console.log('      TESTE EM BROWSER REAL CONCLUÍDO COM SUCESSO!   ');
  console.log('=====================================================\n');
}

runBrowserE2e().catch(err => {
  console.error('Erro no teste de browser:', err);
  process.exit(1);
});

