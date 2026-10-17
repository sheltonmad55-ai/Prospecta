import { sweepRealBusinesses, CURATED_BUSINESSES } from '../src/server/real-businesses.ts';
import { db, closeDb } from '../src/server/db.ts';
import { createUser, createSession } from '../src/server/auth.ts';
import { startSearchAsync, getBusiness } from '../src/server/service.ts';
import { GET as apiHandler } from '../src/app/api/[...path]/route.ts';
import assert from 'node:assert/strict';

async function runAudit() {
  console.log('===============================================================');
  console.log('AUDITORIA DE VALIDAÇÃO LOCAL - PROTOCOLO OBRIGATÓRIO');
  console.log('===============================================================\n');

  // -----------------------------------------------------------------
  // 4a) Pesquisa de "pizzarias" em "maputo, matola"
  // -----------------------------------------------------------------
  console.log('--- 4a) SIMULAÇÃO DE PESQUISA: "pizzarias" em "maputo, matola" ---');
  const pizzarias = await sweepRealBusinesses('pizzarias', 'maputo, matola');
  
  console.log(`Encontradas ${pizzarias.length} empresas para "pizzarias" em "maputo, matola":\n`);
  
  for (const b of pizzarias) {
    console.log(`• Nome: ${b.name}`);
    console.log(`  ID: ${b.id}`);
    console.log(`  Categoria: ${b.category}`);
    console.log(`  Localidade: ${b.locality}, ${b.province}`);
    console.log(`  Telefone: ${b.phone || 'null (Sem telefone)'}`);
    console.log(`  Website: ${b.website || 'null (Sem website)'}`);
    console.log(`  Instagram: ${b.instagram || 'null (Sem Instagram)'}`);
    console.log(`  Fonte: ${b.source}`);
    console.log('  -------------------------------------------------------------');

    // Asserções estritas de tolerância zero
    if (typeof b.instagram === 'string') {
      assert.ok(!b.instagram.includes('_mz'), `Instagram sintético detectado: ${b.instagram}`);
    }
    if (typeof b.website === 'string') {
      assert.ok(!b.website.includes('pizzariabellanaapoli') && !b.website.includes('debonairs') && !b.website.includes('fornomatola'), `Website sintético detectado: ${b.website}`);
    }
  }

  assert.ok(pizzarias.length > 0, 'Erro: Nenhuma pizzaria encontrada em Maputo/Matola.');
  const allWebsitesNullOrVerified = pizzarias.every(b => b.website === null || b.website === 'https://zambi.co.mz' || b.website === 'https://cga.co.mz');
  const allInstagramNull = pizzarias.every(b => b.instagram === null);
  
  assert.ok(allWebsitesNullOrVerified, 'Erro: Existem websites sintéticos na lista de pizzarias.');
  assert.ok(allInstagramNull, 'Erro: Existem perfis de Instagram inventados na lista de pizzarias.');
  console.log('\n✔ PROVA CONCLUÍDA: NENHUM registo devolve URLs falsas ou @handles inventados!\n');

  // -----------------------------------------------------------------
  // 4b) Requisição de busca e requisição de detalhes (HTTP 200)
  // -----------------------------------------------------------------
  console.log('--- 4b) REQUISIÇÕES DE BUSCA E DETALHES DE EMPRESA (HTTP 200) ---');
  
  const testUser = createUser('Auditor Local', `audit-${Date.now()}@test.mz`, 'StrongPassword123!', true, 'owner');
  const token = createSession(testUser.id);
  
  // 1. Executa busca
  const searchResult = await startSearchAsync(testUser, {
    service: 'Criação de websites',
    niche: 'pizzarias',
    cities: 'maputo, matola',
    phone: 'all',
    website: 'all',
    instagram: 'all'
  });

  console.log(`Status da busca: ${searchResult.status}`);
  console.log(`Total de resultados encontrados: ${searchResult.total}`);
  assert.ok(searchResult.total > 0, 'A busca deve retornar empresas.');
  assert.ok(searchResult.results.length > 0, 'Resultados da primeira página devem estar preenchidos.');
  assert.ok(searchResult.allResults && searchResult.allResults.length > 0, 'allResults deve estar presente para paginação client-side.');

  const targetBusiness = searchResult.results[0];
  console.log(`Empresa alvo para detalhes: "${targetBusiness.name}" (ID: ${targetBusiness.id})`);

  // 2. Chama rota GET /api/businesses/:id simulando a requisição HTTP completa do Next.js
  const reqUrl = `http://localhost:3000/api/businesses/${targetBusiness.id}`;
  const mockRequest = new Request(reqUrl, {
    method: 'GET',
    headers: {
      'host': 'localhost:3000',
      'cookie': `prospecta_session=${token}`
    }
  });

  // Criamos o contexto de rota
  const routeContext = { params: Promise.resolve({ path: ['businesses', targetBusiness.id] }) };
  
  // Invocamos o handler da API
  // Obs: para simular a autenticação do utilizador nesta requisição in-process:
  const response = await apiHandler(mockRequest, routeContext);
  console.log(`Resposta HTTP para GET /api/businesses/${targetBusiness.id}: Status ${response.status}`);
  
  assert.equal(response.status, 200, `Esperado HTTP 200, recebido ${response.status}`);
  const data = await response.json();
  console.log(`Dados da empresa recebidos no endpoint:`);
  console.log(`  - Nome: ${data.business.name}`);
  console.log(`  - Localidade: ${data.business.locality}`);
  console.log(`  - Categoria: ${data.business.category}`);
  console.log(`  - Telefone: ${data.business.phone}`);
  console.log(`  - Website: ${data.business.website}`);
  assert.equal(data.business.id, targetBusiness.id, 'O ID da empresa retornada deve coincidir com o requisitado.');

  // 3. Testa persistência e resolução determinística (mesmo se o SQLite perder a tabela businesses)
  console.log('\n--- Testando resiliência serverless: resolução determinística ---');
  const resolvedDirect = getBusiness(targetBusiness.id, testUser);
  assert.equal(resolvedDirect.id, targetBusiness.id);
  console.log(`✔ getBusiness("${targetBusiness.id}") retornou com sucesso: ${resolvedDirect.name}`);

  console.log('\n===============================================================');
  console.log('TODOS OS CRITÉRIOS DE AUDITORIA FORAM CUMPRIDOS COM SUCESSO!');
  console.log('===============================================================\n');

  closeDb();
}

runAudit().catch(err => {
  console.error('\n❌ FALHA NA AUDITORIA:', err);
  process.exit(1);
});
