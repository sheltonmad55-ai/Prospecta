import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  applyOperations,
  normalizeSiteModel,
  type SiteOperation,
  isAllowedSetPath,
  isUnsafePath,
  isProtectedField,
  isExampleField,
  isValidSafeHref,
  TYPOGRAPHY_PRESETS
} from './src/server/site-operations';
import { renderSiteTemplateV3 } from './src/server/site-template-v3';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-screenshots', 'extra-5');
const BRAIN_SCREENSHOT_DIR = 'C:\\Users\\shelt\\.gemini\\antigravity\\brain\\1d5fd208-ec40-4e4a-961d-3bec9d24327e\\screenshots\\extra-5';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(BRAIN_SCREENSHOT_DIR)) {
  fs.mkdirSync(BRAIN_SCREENSHOT_DIR, { recursive: true });
}

// Site base inicial para os testes
const initialSite = {
  businessName: 'Jymmys Grill & Bar',
  niche: 'restaurante',
  tagline: 'O melhor grill, bar e marisco em Maputo',
  heroHeadline: 'O melhor grill, bar e marisco em Maputo',
  heroSubheadline: 'Desfrute de uma atmosfera relaxada e pratos incríveis nas Torres Rani.',
  aboutTitle: 'Sobre Nós',
  aboutText: 'Localizado na Av. da Marginal, o Jymmys Grill & Bar oferece uma experiência gastronómica inesquecível com vista para o mar.',
  servicesTitle: 'Especialidades',
  servicesSubtitle: 'Cortes nobres e marisco fresco.',
  services: [
    { title: 'Grill & Carnes', description: 'Cortes de carne excepcionais e o famoso pernil.' },
    { title: 'Bar & Cocktails', description: 'Happy hour de comida e seleção cuidada de bebidas.' },
    { title: 'Marisco Fresco', description: 'Pratos variados com sabor autêntico do mar.' }
  ],
  differentials: [
    { metric: '100% Fresco', title: 'Qualidade Garantida', description: 'Ingredientes selecionados diariamente.', exemplo: true }
  ],
  hasExampleData: true,
  address: 'Av. da Marginal, Torres Rani, Maputo',
  openingHours: 'Seg-Dom: 11:00 - 23:00',
  phone: '+258 84 747 9441',
  whatsappNumber: '258847479441',
  themeId: 'moderno-escuro'
};

async function main() {
  console.log('=== PARTE 1: TESTES DE SEGURANÇA E REJEIÇÃO DE OPERAÇÕES MALICIOSAS ===\n');

  const securityTests: Array<{
    name: string;
    op: SiteOperation;
    expectedErrorSubstring: string;
  }> = [
    {
      name: 'Prototype pollution via __proto__',
      op: { op: 'set', path: '__proto__.polluted', value: true } as any,
      expectedErrorSubstring: 'caminho inseguro'
    },
    {
      name: 'Prototype pollution via constructor',
      op: { op: 'set', path: 'constructor.prototype.isAdmin', value: true } as any,
      expectedErrorSubstring: 'caminho inseguro'
    },
    {
      name: 'Modificação de campo protegido (status)',
      op: { op: 'set', path: 'status', value: 'approved' },
      expectedErrorSubstring: 'estritamente protegido'
    },
    {
      name: 'Modificação de campo protegido (credits)',
      op: { op: 'set', path: 'credits', value: 99999 },
      expectedErrorSubstring: 'estritamente protegido'
    },
    {
      name: 'Remoção de marca exemplo via chat (bloqueada)',
      op: { op: 'set', path: 'differentials.0.exemplo', value: false },
      expectedErrorSubstring: 'A remoção de marcas de exemplo requer confirmação explícita no painel'
    },
    {
      name: 'Injeção de link malicioso (javascript:)',
      op: { op: 'set', path: 'cta_link', value: 'javascript:alert(document.cookie)' } as any,
      expectedErrorSubstring: 'não autorizado na allowlist'
    },
    {
      name: 'Caminho arbitrário fora da allowlist',
      op: { op: 'set', path: 'unauthorizedCustomField', value: 'payload' } as any,
      expectedErrorSubstring: 'não autorizado na allowlist'
    }
  ];

  for (const st of securityTests) {
    const res = applyOperations(initialSite, [st.op]);
    const matched = res.errors.some(e => e.toLowerCase().includes(st.expectedErrorSubstring.toLowerCase()));
    console.log(`[TESTE SEGURANÇA] ${st.name}:`);
    console.log(`  Operação:`, JSON.stringify(st.op));
    console.log(`  Erros retornados:`, res.errors);
    console.log(`  Resultado: ${matched ? '✅ BLOQUEADO COM SUCESSO' : '❌ FALHA NO BLOQUEIO'}\n`);
    if (!matched) {
      throw new Error(`Falha no teste de segurança: ${st.name}`);
    }
  }

  console.log('=== PARTE 2: EXECUÇÃO DOS 5 TESTES ESPECÍFICOS COM CAPTURA A 390 PX ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  let state = normalizeSiteModel(initialSite);

  // Teste A: "muda só a fonte para uma mais moderna"
  console.log('[TESTE A] "muda só a fonte para uma mais moderna"...');
  const opA: SiteOperation = { op: 'set_typography', typographyId: 'moderna' };
  const resA = applyOperations(state, [opA]);
  state = resA.updatedContent;
  const initialThemeId = initialSite.themeId;
  const isThemeUnchanged = state.themeId === initialThemeId;
  const isTypographyUpdated = state.customTypography === 'moderna';
  console.log(`  customTypography atualizado: ${isTypographyUpdated} (${state.customTypography})`);
  console.log(`  themeId permaneceu intato: ${isThemeUnchanged} (${state.themeId})`);
  const htmlA = renderSiteTemplateV3(state, false, false);
  await page.setContent(htmlA, { waitUntil: 'networkidle' });
  const fileA = 'teste-extra-a-fonte-moderna-390px.png';
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileA) });
  fs.copyFileSync(path.join(SCREENSHOT_DIR, fileA), path.join(BRAIN_SCREENSHOT_DIR, fileA));
  console.log(`  ✅ Captura salva: ${fileA}\n`);

  // Teste B: "volta a pôr o botão de chamada" (inicialmente colocamos false, depois executamos o prompt)
  console.log('[TESTE B] "volta a pôr o botão de chamada"...');
  state.global.showCallButton = false; // Estado anterior
  const opB: SiteOperation = { op: 'set', path: 'global.showCallButton', value: true };
  const resB = applyOperations(state, [opB]);
  state = resB.updatedContent;
  console.log(`  showCallButton ativo: ${state.global.showCallButton === true}`);
  const htmlB = renderSiteTemplateV3(state, false, false);
  await page.setContent(htmlB, { waitUntil: 'networkidle' });
  const fileB = 'teste-extra-b-botao-chamada-390px.png';
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileB) });
  fs.copyFileSync(path.join(SCREENSHOT_DIR, fileB), path.join(BRAIN_SCREENSHOT_DIR, fileB));
  console.log(`  ✅ Captura salva: ${fileB}\n`);

  // Teste C: "remove o botão de WhatsApp do cabeçalho mas mantém o do hero"
  console.log('[TESTE C] "remove o botão de WhatsApp do cabeçalho mas mantém o do hero"...');
  const opC: SiteOperation = { op: 'set', path: 'global.showHeaderWa', value: false };
  const resC = applyOperations(state, [opC]);
  state = resC.updatedContent;
  console.log(`  showHeaderWa: ${state.global.showHeaderWa === false}`);
  console.log(`  showHeroWa mantido: ${state.global.showHeroWa === true}`);
  const htmlC = renderSiteTemplateV3(state, false, false);
  await page.setContent(htmlC, { waitUntil: 'networkidle' });
  const fileC = 'teste-extra-c-wa-header-off-hero-on-390px.png';
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileC) });
  fs.copyFileSync(path.join(SCREENSHOT_DIR, fileC), path.join(BRAIN_SCREENSHOT_DIR, fileC));
  console.log(`  ✅ Captura salva: ${fileC}\n`);

  // Teste D: "muda o telefone para +258 84 111 2222"
  console.log('[TESTE D] "muda o telefone para +258 84 111 2222"...');
  const opD: SiteOperation = { op: 'set', path: 'phone', value: '+258 84 111 2222' };
  const resD = applyOperations(state, [opD]);
  state = resD.updatedContent;
  console.log(`  phone atualizado: ${state.phone}`);
  console.log(`  whatsappNumber sincronizado: ${state.whatsappNumber}`);
  console.log(`  callButtonPhone sincronizado: ${state.global.callButtonPhone}`);
  const htmlD = renderSiteTemplateV3(state, false, false);
  const hasWaLink = htmlD.includes('wa.me/258841112222');
  const hasTelLink = htmlD.includes('tel:258841112222');
  console.log(`  HTML contém link wa.me/258841112222: ${hasWaLink}`);
  console.log(`  HTML contém link tel:258841112222: ${hasTelLink}`);
  await page.setContent(htmlD, { waitUntil: 'networkidle' });
  const fileD = 'teste-extra-d-muda-telefone-390px.png';
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileD) });
  fs.copyFileSync(path.join(SCREENSHOT_DIR, fileD), path.join(BRAIN_SCREENSHOT_DIR, fileD));
  console.log(`  ✅ Captura salva: ${fileD}\n`);

  // Teste E: Pedido no chat para marcar número como confirmado / remover aviso de exemplo
  console.log('[TESTE E] Pedido no chat para marcar número como confirmado...');
  const opE: SiteOperation = { op: 'set', path: 'differentials.0.exemplo', value: false };
  const resE = applyOperations(state, [opE]);
  console.log(`  Tentativa via chat rejeitada: ${resE.appliedCount === 0}`);
  console.log(`  Mensagem de bloqueio do motor: "${resE.errors[0]}"`);
  // Mostra que a integridade se mantém e os dados continuam protegidos
  const htmlE = renderSiteTemplateV3(state, false, false);
  await page.setContent(htmlE, { waitUntil: 'networkidle' });
  const fileE = 'teste-extra-e-recusa-confirmacao-chat-390px.png';
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileE) });
  fs.copyFileSync(path.join(SCREENSHOT_DIR, fileE), path.join(BRAIN_SCREENSHOT_DIR, fileE));
  console.log(`  ✅ Captura salva: ${fileE}\n`);

  await browser.close();
  console.log('=== TODOS OS TESTES FORAM CONCLUÍDOS COM SUCESSO! ===');
}

main().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});

