import http from 'node:http';
import { chromium } from 'playwright';
import { renderSiteTemplate, type SiteContent } from '../src/server/site-template';

async function testWaForm() {
  const mockContent: SiteContent = {
    businessName: 'Clínica Dentária Sorriso Matola',
    tagline: 'Excelência e Cuidado Dentário',
    heroHeadline: 'O seu sorriso perfeito',
    heroSubheadline: 'Cuide da sua saúde oral.',
    aboutText: 'Clínica de referência.',
    services: [
      { title: 'Ortodontia', description: 'Aparelhos dentários.' }
    ],
    address: 'Av. das Indústrias, Matola Fomento',
    openingHours: 'Segunda a Sábado, 08h às 18h',
    phone: '+258 84 311 9920',
    whatsappNumber: '258843119920',
    whatsappMessage: 'Olá!',
    style: 'moderno',
    primaryColor: '#0ea5e9'
  };

  const html = renderSiteTemplate(mockContent, true);

  const server = http.createServer((req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: data:; frame-src https://www.google.com; sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox"
    });
    res.end(html);
  });

  await new Promise<void>((resolve) => server.listen(48922, '127.0.0.1', () => resolve()));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  await page.goto('http://127.0.0.1:48922');

  await page.fill('#waNome', 'Carlos Tembe');
  await page.selectOption('#waServico', 'Ortodontia');
  await page.fill('#waData', 'Amanhã às 14h');
  await page.fill('#waMsg', 'Tenho interesse.');

  const resultUrl = await page.evaluate(() => {
    let captured = '';
    window.open = function(url) {
      captured = String(url);
      return null;
    };
    (window as any).sendWa();
    return captured;
  });

  console.log('URL gerada por sendWa():', resultUrl);

  await browser.close();
  server.close();
}

testWaForm();

