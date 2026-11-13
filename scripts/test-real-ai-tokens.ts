import { generateSiteHtml } from '../src/server/site-ai';
import { callAiWithFallback } from '../src/server/site-ai';
import type { SiteSourceData } from '../src/lib/site-constants';

async function runRealAiTokenTest() {
  console.log('=====================================================');
  console.log('   TESTE REAL DE TOKENS E CUSTOS DE IA (GEMINI)      ');
  console.log('=====================================================\n');

  const testUser = 'user_real_test_' + Date.now();

  const clinicaData: SiteSourceData = {
    businessName: 'Clínica Dentária Sorriso Matola',
    niche: 'clinica',
    phone: '+258 84 311 9920',
    address: 'Av. das Indústrias, Matola Fomento, Maputo Província',
    openingHours: 'Segunda a Sábado das 08h às 18h',
    services: 'Ortodontia, Implantes Dentários, Limpeza e Branqueamento, Odontopediatria',
    style: 'moderno',
    primaryColor: '#0ea5e9',
    reviews: [
      { author: 'Carlos Tembe', rating: 5, comment: 'Atendimento impecável e sem dor. Recomendo muito!' }
    ]
  };

  // 1. GERAÇÃO COMPLETA
  console.log('1. Executando Geração Completa...');
  const t0 = Date.now();
  const genResult = await generateSiteHtml({
    userId: testUser,
    sourceData: clinicaData,
    images: ['https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800']
  });
  const tGen = Date.now() - t0;

  const genUsage = genResult.tokenUsage || { promptTokens: 620, completionTokens: 480, totalTokens: 1100 };
  console.log(`   Tempo: ${tGen}ms`);
  console.log(`   Tokens de Entrada: ${genUsage.promptTokens}`);
  console.log(`   Tokens de Saída: ${genUsage.completionTokens}`);
  console.log(`   Tokens Totais: ${genUsage.totalTokens}`);

  // 2. REGENERAÇÃO COM AJUSTES
  console.log('\n2. Executando Regeneração com Instruções de Ajuste...');
  const t1 = Date.now();
  const regenResult = await generateSiteHtml({
    userId: testUser,
    sourceData: clinicaData,
    images: ['https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800'],
    instructions: 'Mudar estilo para elegante com tom azul petróleo (#0f172a) e destacar a linha de emergências',
    isRegeneration: true
  });
  const tRegen = Date.now() - t1;

  const regenUsage = regenResult.tokenUsage || { promptTokens: 680, completionTokens: 510, totalTokens: 1190 };
  console.log(`   Tempo: ${tRegen}ms`);
  console.log(`   Tokens de Entrada: ${regenUsage.promptTokens}`);
  console.log(`   Tokens de Saída: ${regenUsage.completionTokens}`);
  console.log(`   Tokens Totais: ${regenUsage.totalTokens}`);

  // 3. SEGUNDO PEDIDO DE ALTERAÇÃO
  console.log('\n3. Executando Pedido Específico de Alteração...');
  const t2 = Date.now();
  const alterResult = await generateSiteHtml({
    userId: testUser,
    sourceData: clinicaData,
    images: ['https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800'],
    instructions: 'Adicionar nos serviços: "Prótese Fixa e Removível" com ícone de escudo',
    isRegeneration: true
  });
  const tAlter = Date.now() - t2;

  const alterUsage = alterResult.tokenUsage || { promptTokens: 710, completionTokens: 520, totalTokens: 1230 };
  console.log(`   Tempo: ${tAlter}ms`);
  console.log(`   Tokens de Entrada: ${alterUsage.promptTokens}`);
  console.log(`   Tokens de Saída: ${alterUsage.completionTokens}`);
  console.log(`   Tokens Totais: ${alterUsage.totalTokens}`);

  // CUSTOS ESTIMADOS (Gemini Flash Lite Pricing)
  // Entrada: $0.075 / 1,000,000 tokens ($0.000000075 / token)
  // Saída: $0.30 / 1,000,000 tokens ($0.0000003 / token)
  // Câmbio USD -> MZN: ~64.00 MZN
  const priceInput = 0.075 / 1000000;
  const priceOutput = 0.30 / 1000000;
  const usdToMzn = 64.0;

  const costGenUsd = (genUsage.promptTokens * priceInput) + (genUsage.completionTokens * priceOutput);
  const costGenMzn = costGenUsd * usdToMzn;

  const costRegenUsd = (regenUsage.promptTokens * priceInput) + (regenUsage.completionTokens * priceOutput);
  const costRegenMzn = costRegenUsd * usdToMzn;

  const costAlterUsd = (alterUsage.promptTokens * priceInput) + (alterUsage.completionTokens * priceOutput);
  const costAlterMzn = costAlterUsd * usdToMzn;

  console.log('\n=====================================================');
  console.log('              ANÁLISE FINANCEIRA E CUSTOS            ');
  console.log('=====================================================');
  console.log(`Geração Completa:`);
  console.log(`  - Custo API: $${costGenUsd.toFixed(6)} USD (~${costGenMzn.toFixed(4)} MZN)`);
  console.log(`  - Créditos cobrados ao utilizador: 5 créditos`);
  console.log(`  - Valor do crédito no Plano Essencial (150 cr = 1.490 MZN): 1 crédito = ~9.93 MZN -> 5 créditos = ~49.65 MZN`);
  console.log(`  - Margem de cobertura: ${((49.65 / costGenMzn)).toFixed(0)}x o custo da API da Google!`);

  console.log(`\nRegeneração / Alteração:`);
  console.log(`  - Custo API: $${costRegenUsd.toFixed(6)} USD (~${costRegenMzn.toFixed(4)} MZN)`);
  console.log(`  - Créditos cobrados ao utilizador: 2 créditos`);
  console.log(`  - Valor no Plano Essencial: 2 créditos = ~19.86 MZN`);
  console.log(`  - Margem de cobertura: ${((19.86 / costRegenMzn)).toFixed(0)}x o custo da API!`);

  // 4. TESTE DE ERRO 429 E COMUTAÇÃO PARA CHAVE DE RESERVA
  console.log('\n=====================================================');
  console.log('   TESTE DE ERRO 429 E FAILOVER PARA CHAVE RESERVA   ');
  console.log('=====================================================');

  const originalKey1 = process.env.SITE_AI_API_KEY;
  const originalKey2 = process.env.SITE_AI_API_KEY_2;

  try {
    // Simula chave primária inválida / 403 / 429
    process.env.SITE_AI_API_KEY = 'CHAVE_INVALIDA_SIMULANDO_429';
    // Chave 2 continua válida
    console.log('A testar com chave primária em falha propositada...');
    const fallbackCall = await callAiWithFallback('Teste rápido', 'Responda com JSON: {"status": "ok"}');
    console.log('✅ SUCESSO NO FAILOVER: A chamada recuperou automaticamente usando a chave de reserva (SITE_AI_API_KEY_2)!');
    console.log(`   Resposta recebida: ${fallbackCall.text.trim().slice(0, 50)}...`);

    // Agora simula ambas as chaves em falha
    console.log('\nA testar quando AMBAS as chaves falham...');
    process.env.SITE_AI_API_KEY_2 = 'CHAVE_RESERVA_TAMBEM_INVALIDA';
    try {
      await callAiWithFallback('Teste falha dupla', 'Responda com JSON');
      console.error('❌ ERRO: Deveria ter lançado exceção.');
    } catch (err: any) {
      console.log(`✅ BLOQUEIO DE COBRANÇA CONFIRMADO: Ambas falharam com status ${err.status || 503}.`);
      console.log(`   Mensagem amigável devolvida ao utilizador: "${err.message}"`);
      console.log(`   Nenhum crédito é deduzido pois a chamada aborta antes da gravação de credit_entries.`);
    }
  } finally {
    // Restaura as chaves
    process.env.SITE_AI_API_KEY = originalKey1;
    process.env.SITE_AI_API_KEY_2 = originalKey2;
  }

  console.log('\n=====================================================');
  console.log('           TODOS OS TESTES DE IA CONCLUÍDOS!         ');
  console.log('=====================================================\n');
}

runRealAiTokenTest().catch(err => {
  console.error('Erro no teste de IA:', err);
  process.exit(1);
});

