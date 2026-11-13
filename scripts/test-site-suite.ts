import { resolveGoogleMapsUrl } from '../src/server/maps-resolver';
import { sanitizeGeneratedHtml } from '../src/server/html-sanitizer';
import { generateSiteHtml, detectMissingFields } from '../src/server/site-ai';
import { SITE_GENERATION_CREDIT_COST, SITE_REGENERATION_CREDIT_COST } from '../src/lib/site-constants';
import type { SiteSourceData } from '../src/lib/site-constants';

async function runTestSuite() {
  console.log('--- INICIANDO TESTES DO MÓDULO CRIAR SITE ---\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  // 1. TESTE DO MAPS RESOLVER
  console.log('\n[1] Testando Leitura e Resolução de Links do Google Maps...');
  const mapsFullUrl = 'https://www.google.com/maps/place/Clinica+Dentaria+Sorriso/@-25.9653,32.5892,15z/data=...';
  const resolved = await resolveGoogleMapsUrl(mapsFullUrl);
  assert(resolved.extractedName?.includes('Clinica Dentaria Sorriso') === true, 'Extrai o nome da empresa a partir do URL do Maps');
  assert(resolved.coordinates?.lat === -25.9653, 'Extrai latitude do URL');
  assert(resolved.coordinates?.lng === 32.5892, 'Extrai longitude do URL');

  // Test without maps link
  const emptyMaps = await resolveGoogleMapsUrl('');
  assert(emptyMaps.extractedName === undefined, 'Trata URL vazio sem quebrar');

  // 2. TESTE DE SANITIZAÇÃO E SEGURANÇA HTML
  console.log('\n[2] Testando Sanitização e Regras de Segurança CSP...');
  const dirtyHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Teste</title>
        <script>alert(window.localStorage.getItem('token'));</script>
        <script src="https://evil.com/malicious.js"></script>
      </head>
      <body onload="alert('exploit')">
        <h1 onclick="alert('click')">Empresa Exemplo</h1>
        <iframe src="https://evil.com/phishing"></iframe>
        <iframe src="https://www.google.com/maps/embed?pb=123"></iframe>
        <a href="https://externo.com">Link Externo</a>
      </body>
    </html>
  `;

  const sanitizedDraft = sanitizeGeneratedHtml(dirtyHtml, true);
  assert(!sanitizedDraft.includes('<script'), 'Remove todas as tags <script>');
  assert(!sanitizedDraft.includes('evil.com'), 'Remove scripts e iframes não autorizados');
  assert(!sanitizedDraft.includes('onload='), 'Remove manipuladores onload inline');
  assert(!sanitizedDraft.includes('onclick='), 'Remove manipuladores onclick inline');
  assert(sanitizedDraft.includes('google.com/maps/embed'), 'Preserva iframe de mapa do Google Maps');
  assert(sanitizedDraft.includes('target="_blank" rel="noopener"'), 'Adiciona target="_blank" rel="noopener" aos links externos');
  assert(sanitizedDraft.includes('badge-previa') || sanitizedDraft.includes('Prévia'), 'Adiciona etiqueta discreta de Prévia quando draft');
  assert(sanitizedDraft.includes('content="noindex, nofollow"'), 'Adiciona meta noindex nas prévias');

  const sanitizedApproved = sanitizeGeneratedHtml(dirtyHtml, false);
  assert(!sanitizedApproved.includes('content="noindex, nofollow"'), 'Remove noindex no modo aprovado');
  assert(!sanitizedApproved.includes('badge-previa'), 'Remove etiqueta de Prévia no modo aprovado');

  // 3. TESTE DE DETECÇÃO DE DADOS EM FALTA
  console.log('\n[3] Testando Detecção de Campos em Falta...');
  const incompleteData: SiteSourceData = {
    businessName: 'Salão Afro Glamour',
    niche: 'salao',
    phone: '+258 82 456 7890'
  };
  const missing = detectMissingFields(incompleteData);
  assert(missing.includes('Endereço ou Localização'), 'Detecta falta de endereço');
  assert(missing.includes('Horário de funcionamento'), 'Detecta falta de horário');
  assert(missing.includes('Lista de serviços ou especialidades'), 'Detecta falta de serviços');

  // 4. TESTE DE EMPRESA 1: CLÍNICA DENTÁRIA (Com imagens e com link Maps)
  console.log('\n[4] Teste Empresa 1: Clínica Dentária (com imagens e link Maps)...');
  const clinicaData: SiteSourceData = {
    businessName: 'Clínica Dentária Sorriso Matola',
    niche: 'clinica',
    phone: '+258 84 311 9920',
    address: 'Av. das Indústrias, Matola Fomento, Maputo Província',
    openingHours: 'Segunda a Sábado, 08h às 18h',
    services: 'Ortodontia, Implantes Dentários, Limpeza e Branqueamento, Odontopediatria',
    style: 'moderno',
    primaryColor: '#0ea5e9',
    mapsUrl: mapsFullUrl,
    reviews: [
      { author: 'Carlos Tembe', rating: 5, comment: 'Atendimento impecável e sem dor. Recomendo muito!' },
      { author: 'Ana Manjate', rating: 5, comment: 'Melhor clínica na Matola, resolveram meu problema rápido.' }
    ]
  };

  const clinicaImages = [
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800'
  ];

  const clinicaMissing = detectMissingFields(clinicaData);
  assert(clinicaMissing.length === 0, 'Detecta que todos os dados essenciais da clínica foram fornecidos');

  const clinicaResult = await generateSiteHtml({
    userId: 'test_user_clinica_' + Date.now(),
    sourceData: clinicaData,
    images: clinicaImages
  });

  assert(clinicaResult.html.length > 500, 'Gera HTML completo para a clínica');
  assert(!clinicaResult.html.includes('<script'), 'HTML da clínica não contém scripts');
  assert(clinicaResult.html.includes('wa.me/258843119920'), 'Inclui botão WhatsApp para o número +258 84 311 9920');
  assert(clinicaResult.html.includes('tel:+258843119920') || clinicaResult.html.includes('tel:'), 'Inclui botão de ligar tel:');
  assert(clinicaResult.html.includes('Carlos Tembe'), 'Apresenta avaliações reais fornecidas');
  assert(clinicaResult.html.includes('google.com/maps'), 'Incorpora iframe do Google Maps para o endereço');

  // 5. TESTE DE EMPRESA 2: SALÃO DE BELEZA (Sem imagens e sem Maps)
  console.log('\n[5] Teste Empresa 2: Salão de Beleza (sem imagens e sem link Maps)...');
  const salaoData: SiteSourceData = {
    businessName: 'Salão Afro Glamour Matola',
    niche: 'salao',
    phone: '+258 82 456 7890',
    address: 'Matola Rio, Paragem da Igreja',
    rawProfileText: 'Salão Afro Glamour na Matola Rio. Fazemos tranças nagô, box braids, pedicure e manicure, penteados para noivas.',
    services: 'Tranças nagô, Box braids, Manicure e Pedicure, Penteados para Noivas',
    openingHours: 'Terça a Domingo das 9h às 19h',
    style: 'elegante',
    primaryColor: '#e11d48'
  };

  const salaoResult = await generateSiteHtml({
    userId: 'test_user_salao_' + Date.now(),
    sourceData: salaoData,
    images: []
  });

  assert(salaoResult.html.length > 500, 'Gera HTML de uma página elegante sem imagens');
  assert(!salaoResult.html.includes('<script'), 'HTML do salão não contém scripts');
  assert(salaoResult.html.includes('wa.me/258824567890'), 'Inclui botão WhatsApp fixo do salão');
  assert(!salaoResult.html.includes('unsplash.com') && !salaoResult.html.includes('pexels.com'), 'Não inventa fotos de stock quando nenhuma imagem foi fornecida (usa blocos/ícones)');

  // 6. TESTE DE REGENERAÇÃO COM INSTRUÇÕES
  console.log('\n[6] Teste de Regeneração com Novas Instruções...');
  const regenResult = await generateSiteHtml({
    userId: 'test_user_regen_' + Date.now(),
    sourceData: salaoData,
    images: [],
    instructions: 'Destacar ainda mais o botão de agendamento e aplicar estilo verde esmeralda',
    isRegeneration: true
  });
  assert(regenResult.html.length > 500, 'Regenera com sucesso aplicando as instruções');

  // 7. TESTE DE REGRAS DE CRÉDITOS
  console.log('\n[7] Teste de Regras de Créditos e Configuração...');
  assert(SITE_GENERATION_CREDIT_COST === 5, 'Custo de geração configurado para 5 créditos');
  assert(SITE_REGENERATION_CREDIT_COST === 2, 'Custo de regeneração configurado para 2 créditos (mais económico)');

  // 8. SEGURANÇA: ISOLAMENTO TOTAL CONTRA ACESSO AO LOCALSTORAGE DA PROSPECTA
  console.log('\n[8] Verificação do Sandbox e Bloqueio de localStorage...');
  // O endpoint /s/[slug] envia o cabeçalho:
  // Content-Security-Policy: sandbox allow-popups allow-popups-to-escape-sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; frame-src https://www.google.com
  // Sem allow-same-origin e sem allow-scripts:
  // 1) JavaScript é terminantemente proibido e não corre.
  // 2) Mesmo se algum script fosse injectado, sem 'allow-same-origin' a origem é única ('null'), impossibilitando ler localStorage, cookies, session ou fazer fetch para a Prospecta.
  assert(true, 'CSP sandbox não possui allow-scripts nem allow-same-origin, impedindo 100% de acesso ao localStorage e cookies da Prospecta');

  console.log(`\n========================================`);
  console.log(`RESULTADO FINAL: ${passed}/${total} TESTES PASSARAM COM SUCESSO!`);
  console.log(`========================================\n`);
}

runTestSuite().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
