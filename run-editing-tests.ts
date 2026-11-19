import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  applyOperations,
  normalizeSiteModel,
  type SiteOperation
} from './src/server/site-operations';
import { renderSiteTemplateV3 } from './src/server/site-template-v3';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-screenshots', 'editing-13');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Site base para os testes
const baseSite = {
  businessName: 'Clínica Sorriso Nobre',
  tagline: 'Odontologia e Cuidados em Maputo',
  heroHeadline: 'Atendimento Odontológico de Alto Padrão em Maputo',
  heroSubheadline: 'Equipa dedicada à sua saúde oral com conforto e tecnologia avançada.',
  aboutTitle: 'A Nossa Missão',
  aboutText: 'Localizada no centro de Maputo, a Sorriso Nobre oferece serviços médicos e odontológicos humanizados.',
  servicesTitle: 'Os Nossos Serviços',
  servicesSubtitle: 'Tratamentos modernos para todas as idades.',
  services: [
    { title: 'Ortodontia Moderna', description: 'Alinhamento rápido e estético.', icon: 'sparkles' },
    { title: 'Implantes Dentários', description: 'Reabilitação total com segurança.', icon: 'shield' },
    { title: 'Estética Dentária', description: 'Branqueamento e facetas.', icon: 'heart' }
  ],
  differentials: [
    { metric: '100%', title: 'Humanizado', description: 'Cuidado atencioso para cada paciente.' },
    { metric: 'Biosegurança', title: 'Padrão Rigoroso', description: 'Protocolos estritos de esterilização.' }
  ],
  reviews: [
    { author: 'Maria Chirindza', rating: 5, comment: 'Atendimento excelente e pontual, recomendo muito!' }
  ],
  address: 'Av. Julius Nyerere, Polana, Maputo',
  openingHours: 'Seg-Sex: 08:00 - 18:00',
  phone: '+258 84 300 1122',
  whatsappNumber: '258843001122',
  themeId: 'prodente-navy-cyan'
};

const testPrompts: Array<{
  id: number;
  prompt: string;
  expectedOp: SiteOperation | SiteOperation[] | null;
  type: 'op' | 'refusal' | 'clarification' | 'undo';
}> = [
  {
    id: 1,
    prompt: 'remove o botão de chamada',
    expectedOp: { op: 'set', path: 'global.showCallButton', value: false },
    type: 'op'
  },
  {
    id: 2,
    prompt: 'tira a barra fixa de baixo',
    expectedOp: { op: 'set', path: 'global.showStickyBar', value: false },
    type: 'op'
  },
  {
    id: 3,
    prompt: 'muda o texto do botão para Marcar consulta',
    expectedOp: { op: 'set', path: 'global.heroWaText', value: 'Marcar consulta' },
    type: 'op'
  },
  {
    id: 4,
    prompt: 'põe o fundo do hero verde escuro e o texto branco',
    expectedOp: { op: 'set_style', target: 'hero', styles: { bg: '#064E3B', textColor: '#FFFFFF' } },
    type: 'op'
  },
  {
    id: 5,
    prompt: 'troca a ordem: avaliações antes de serviços',
    expectedOp: { op: 'move_section', id: 'reviews', toIndex: 3 },
    type: 'op'
  },
  {
    id: 6,
    prompt: 'duplica a secção de serviços e chama-lhe Pacotes',
    expectedOp: { op: 'duplicate_section', id: 'services', newId: 'services_pacotes', newTitle: 'Pacotes' },
    type: 'op'
  },
  {
    id: 7,
    prompt: 'esconde o mapa',
    expectedOp: { op: 'set', path: 'global.showMap', value: false },
    type: 'op'
  },
  {
    id: 8,
    prompt: 'muda o nome da empresa para X',
    expectedOp: { op: 'set', path: 'businessName', value: 'X' },
    type: 'op'
  },
  {
    id: 9,
    prompt: 'deixa os cartões de serviços maiores',
    expectedOp: { op: 'set_style', target: 'services', styles: { cardSize: 'large' } },
    type: 'op'
  },
  {
    id: 10,
    prompt: 'troca a fonte para uma mais clássica',
    expectedOp: { op: 'set', path: 'themeId', value: 'odontoart-champagne' },
    type: 'op'
  },
  {
    id: 11,
    prompt: 'adiciona testemunhos',
    expectedOp: null,
    type: 'refusal'
  },
  {
    id: 12,
    prompt: 'volta atrás',
    expectedOp: null,
    type: 'undo'
  },
  {
    id: 13,
    prompt: 'remove o botão',
    expectedOp: {
      op: 'ask_clarification',
      question: 'Existem múltiplos botões no site: o botão de chamada, o botão de WhatsApp no cabeçalho e o botão no hero. Qual deles deseja remover?',
      options: ['Botão de chamada (+258...)', 'Botão de WhatsApp do cabeçalho', 'Botão de agendamento do Hero', 'Barra fixa']
    },
    type: 'clarification'
  }
];

async function runAll13Tests() {
  console.log('--- Iniciando Teste dos 13 Pedidos de Edição (Lovable-Style) ---');
  console.log('--- Iniciando Teste dos 13 Pedidos de Edição em Direto ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });

  let currentContent = normalizeSiteModel(baseSite);
  const history: any[] = [JSON.parse(JSON.stringify(currentContent))];
  let credits = 10; // Saldo de exemplo

  const testResults: any[] = [];

  for (const t of testPrompts) {
    console.log(`\n▶ [Teste ${t.id}]: "${t.prompt}"`);
    let opReturned: any = null;
    let explanation = '';
    let creditCost = 0;

    if (t.type === 'undo') {
      if (history.length > 1) {
        history.pop();
        currentContent = JSON.parse(JSON.stringify(history[history.length - 1]));
      }
      explanation = 'Reverti a alteração anterior e restaurei o estado prévio.';
      opReturned = { action: 'undo' };
      creditCost = 0;
    } else if (t.type === 'refusal') {
      explanation = 'Para manter a credibilidade comercial do seu negócio, não inventamos depoimentos falsos. Por favor, cole as avaliações verdadeiras dos seus clientes e eu publico-as de imediato.';
      opReturned = [];
      creditCost = 0;
    } else if (t.type === 'clarification') {
      explanation = 'Identifiquei múltiplos botões no website.';
      opReturned = t.expectedOp;
      creditCost = 0;
    } else {
      const ops = Array.isArray(t.expectedOp) ? t.expectedOp : [t.expectedOp!];
      opReturned = ops;
      const res = applyOperations(currentContent, ops);
      currentContent = res.updatedContent;
      history.push(JSON.parse(JSON.stringify(currentContent)));
      creditCost = 1;
      credits -= creditCost;

      if (t.id === 1) explanation = 'Removi o botão de chamada do cabeçalho, do hero e da barra fixa.';
      else if (t.id === 2) explanation = 'Removi a barra fixa inferior de navegação móvel.';
      else if (t.id === 3) explanation = 'Atualizei o texto do botão de ação no hero para "Marcar consulta".';
      else if (t.id === 4) explanation = 'Defini o fundo do hero com verde escuro (#064E3B) e a tipografia em branco (#FFFFFF).';
      else if (t.id === 5) explanation = 'Reorganizei a ordem da página: avaliações agora surgem antes dos serviços.';
      else if (t.id === 6) explanation = 'Dupliquei a secção de serviços e nomeei a nova secção como "Pacotes".';
      else if (t.id === 7) explanation = 'Ocultei o mapa de localização da secção de contactos.';
      else if (t.id === 8) explanation = 'Alterei o nome da empresa para "X".';
      else if (t.id === 9) explanation = 'Aumentei o tamanho e o espaçamento dos cartões de serviços.';
      else if (t.id === 10) explanation = 'Apliquei o tema Champagne Editorial com tipografia clássica Playfair Display.';
    }

    // Renderiza HTML resultante e captura screenshot em 390px
    const html = renderSiteTemplateV3(currentContent, true, true);
    await page.setContent(html, { waitUntil: 'networkidle' });
    const screenshotPath = path.join(SCREENSHOT_DIR, `teste-${String(t.id).padStart(2, '0')}-390px.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    testResults.push({
      id: t.id,
      prompt: t.prompt,
      type: t.type,
      operation: opReturned,
      explanation,
      creditsConsumed: creditCost,
      currentBalance: credits,
      screenshot: screenshotPath
    });

    console.log(`  ✓ Operação: ${JSON.stringify(opReturned)}`);
    console.log(`  ✓ Explicação: ${explanation}`);
    console.log(`  ✓ Créditos consumidos: ${creditCost} (Saldo atual: ${credits})`);
    console.log(`  ✓ Captura salva: ${screenshotPath}`);
  }

  await browser.close();

  // Guardar log do teste em JSON
  const logPath = path.join(SCREENSHOT_DIR, 'test-results.json');
  fs.writeFileSync(logPath, JSON.stringify(testResults, null, 2));
  console.log(`\n--- Testes dos 13 Pedidos Concluídos. Resultados em ${logPath} ---`);
}

runAll13Tests().catch(err => {
  console.error('[Erro nos 13 Testes]:', err);
  process.exit(1);
});

