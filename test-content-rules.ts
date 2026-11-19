import { renderSiteTemplateV3 } from './src/server/site-template-v3.ts';

function testContentRules() {
  console.log('--- Testando Regras de Conteúdo e Ausência de Números ---');

  // Gerar sem fornecer diferenciais nem reviews
  const html = renderSiteTemplateV3({
    businessName: 'Oficina Central Matola',
    tagline: 'Mecânica Geral & Reparações',
    heroHeadline: 'Reparação Automóvel Rápida e com Garantia',
    heroSubheadline: 'Cuidamos do seu carro com rigor técnico e honestidade.',
    aboutText: 'Oficina especializada em mecânica geral e eletrónica.',
    services: [
      { title: 'Revisão Geral', description: 'Mudança de óleo e filtros.' }
    ],
    address: 'Matola, Moçambique',
    openingHours: 'Seg-Sex: 08:00 - 17:00',
    phone: '+258 84 123 4567',
    whatsappNumber: '258841234567',
    niche: 'oficina'
  }, true);

  const hasExemploBadge = html.includes('Exemplo');
  const hasReviewsSection = html.includes('Depoimentos dos Nossos Clientes');
  const hasClinicalTermsInAuto = /biosseguran|esteriliza/i.test(html);

  console.log(`[Badge 'Exemplo' presente em números não fornecidos]: ${hasExemploBadge}`);
  console.log(`[Seção de Depoimentos OMITIDA quando não fornecida]: ${!hasReviewsSection}`);
  console.log(`[Sem termos clínicos em nicho de oficina]: ${!hasClinicalTermsInAuto}`);
}

testContentRules();

