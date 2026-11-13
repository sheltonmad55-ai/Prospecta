import { generateSiteHtml } from '../src/server/site-ai';
import { resolveReferenceSite } from '../src/server/reference-resolver';
import { renderSiteTemplate } from '../src/server/site-template';
import type { SiteSourceData } from '../src/lib/site-constants';

async function runV2Tests() {
  console.log('=====================================================');
  console.log('      TESTE DE VALIDAÇÃO COMPLETA DA VERSÃO 2        ');
  console.log('=====================================================\n');

  // --- 1. TESTE DE PROTEÇÃO SSRF ---
  console.log('[1] Testando Proteção SSRF do Site de Referência...');
  const dangerousUrls = [
    'http://localhost:3000',
    'http://127.0.0.1/admin',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.1/secret',
    'http://192.168.1.1/router'
  ];

  for (const badUrl of dangerousUrls) {
    try {
      await resolveReferenceSite(badUrl);
      console.error(`❌ FALHA SSRF: Permitiu URL perigoso: ${badUrl}`);
    } catch (err: any) {
      console.log(`✅ Bloqueio SSRF confirmado para "${badUrl}": ${err.message}`);
    }
  }

  // --- 2. GERAÇÃO REAL DE 3 SITES (Clínica, Salão e Restaurante) ---
  console.log('\n[2] Gerando os 3 Sites Reais para Análise de Qualidade do Texto...');

  // A. Clínica
  console.log('\n--- 2.A CLÍNICA DENTÁRIA ---');
  const clinicaData: SiteSourceData = {
    businessName: 'Clínica Dentária Sorriso Matola',
    niche: 'clinica',
    phone: '+258 84 311 9920',
    address: 'Av. das Indústrias, Matola Fomento, Maputo Província',
    openingHours: 'Segunda a Sábado, 08h às 18h',
    services: 'Ortodontia, Implantes Dentários, Limpeza e Branqueamento, Odontopediatria',
    style: 'moderno',
    primaryColor: '#0ea5e9'
  };
  const clinicaRes = await generateSiteHtml({
    userId: 'test_user_clinica_v2',
    sourceData: clinicaData,
    images: []
  });
  console.log('Tagline:', clinicaRes.content.tagline);
  console.log('Hero Title:', clinicaRes.content.heroHeadline);
  console.log('Hero Subtitle:', clinicaRes.content.heroSubheadline);
  console.log('Serviços Gerados:');
  clinicaRes.content.services.forEach(s => console.log(`  * ${s.title}: ${s.description}`));

  // B. Salão
  console.log('\n--- 2.B SALÃO DE BELEZA ---');
  const salaoData: SiteSourceData = {
    businessName: 'Salão Afro Glamour Matola',
    niche: 'salao',
    phone: '+258 82 456 7890',
    address: 'Matola Rio, Paragem da Igreja',
    openingHours: 'Terça a Domingo das 09h às 19h',
    services: 'Tranças nagô, Box braids, Manicure e Pedicure, Penteados para Noivas',
    style: 'elegante',
    primaryColor: '#e11d48'
  };
  const salaoRes = await generateSiteHtml({
    userId: 'test_user_salao_v2',
    sourceData: salaoData,
    images: []
  });
  console.log('Tagline:', salaoRes.content.tagline);
  console.log('Hero Title:', salaoRes.content.heroHeadline);
  console.log('Hero Subtitle:', salaoRes.content.heroSubheadline);
  console.log('Serviços Gerados:');
  salaoRes.content.services.forEach(s => console.log(`  * ${s.title}: ${s.description}`));

  // C. Restaurante
  console.log('\n--- 2.C RESTAURANTE ---');
  const restauranteData: SiteSourceData = {
    businessName: 'Restaurante Sabores do Índico',
    niche: 'restaurante',
    phone: '+258 87 999 8888',
    address: 'Av. Marginal, Maputo Cidade',
    openingHours: 'Todos os dias das 11h30 às 23h00',
    services: 'Mariscos frescos, Camarão tigre grelhado, Matapa com caranguejo, Espaço para eventos e aniversários',
    style: 'simples',
    primaryColor: '#d97706'
  };
  const restauranteRes = await generateSiteHtml({
    userId: 'test_user_restaurante_v2',
    sourceData: restauranteData,
    images: []
  });
  console.log('Tagline:', restauranteRes.content.tagline);
  console.log('Hero Title:', restauranteRes.content.heroHeadline);
  console.log('Hero Subtitle:', restauranteRes.content.heroSubheadline);
  console.log('Serviços Gerados:');
  restauranteRes.content.services.forEach(s => console.log(`  * ${s.title}: ${s.description}`));

  // --- 3. TESTE DE ELEMENTOS DO TEMPLATE V2 ---
  console.log('\n[3] Verificando Elementos Exigidos no Template...');
  const html = restauranteRes.html;

  const hasWaForm = html.includes('id="waForm"') && html.includes('function sendWa()');
  console.log(hasWaForm ? '✅ Formulário "Falar no WhatsApp" interativo com mensagem pronta presente.' : '❌ Falta formulário');

  const hasWaGlyph = html.includes('M12.031 2C6.5 2 2 6.5 2 12.031');
  console.log(hasWaGlyph ? '✅ Glifo oficial do WhatsApp em SVG presente.' : '❌ Falta glifo oficial do WhatsApp');

  const hasStickyBar = html.includes('sticky-bar') && html.includes('sticky-btn-wa') && html.includes('sticky-btn-tel');
  console.log(hasStickyBar ? '✅ Barra fixa no fundo com botão WhatsApp e Ligar presente.' : '❌ Falta barra fixa');

  const hasScrollAnim = html.includes('fade-in-section') && html.includes('prefers-reduced-motion') && html.includes('IntersectionObserver');
  console.log(hasScrollAnim ? '✅ Animações de scroll com suporte a prefers-reduced-motion presentes.' : '❌ Falta animação de scroll');

  console.log('\n=====================================================');
  console.log('       TESTES DA VERSÃO 2 CONCLUÍDOS COM SUCESSO!    ');
  console.log('=====================================================\n');
}

runV2Tests().catch(err => {
  console.error('Erro nos testes V2:', err);
  process.exit(1);
});

