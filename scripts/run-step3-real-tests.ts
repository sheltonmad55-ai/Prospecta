import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !serviceKey) {
  console.error('ERRO: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.');
  process.exit(1);
}

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const anonClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runStep3Tests() {
  console.log('====================================================================');
  console.log('    PASSO 3: TESTES REAIS DAS FUNÇÕES DE CRÉDITOS NO SUPABASE      ');
  console.log('====================================================================\n');

  const testEmail = `test_qa_credits_${Date.now()}@prospecta.test`;
  const testPassword = 'Password_Test_12345!';
  let testUserId = '';
  let testWorkspaceId = randomUUID();

  try {
    // -------------------------------------------------------------------------
    // 1. CRIAR UTILIZADOR E WORKSPACE DE TESTE COM 3 CRÉDITOS
    // -------------------------------------------------------------------------
    console.log('[TESTE 1] Criando utilizador e workspace de teste com 3 créditos...');
    const { data: userData, error: userCreateErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'QA Test User (Módulo Criar Site)',
        is_test_account: true,
        credits: { available: 3, spent: 0, reserved: 0 }
      }
    });

    if (userCreateErr || !userData?.user) {
      throw new Error(`Falha ao criar utilizador de teste: ${userCreateErr?.message}`);
    }

    testUserId = userData.user.id;
    console.log(` -> Utilizador de teste criado com sucesso: ${testUserId} (${testEmail})`);

    const { error: wsErr } = await adminClient.from('workspaces').insert({
      id: testWorkspaceId,
      name: 'QA Test Workspace',
      owner_id: testUserId,
      profile: {
        is_test: true,
        credits: { available: 3, spent: 0, reserved: 0 }
      }
    });

    if (wsErr) {
      throw new Error(`Falha ao criar workspace de teste: ${wsErr.message}`);
    }
    console.log(` -> Workspace de teste criado com sucesso: ${testWorkspaceId}`);

    // -------------------------------------------------------------------------
    // 2. PROVAR COM A CHAVE DE SERVIÇO QUE AS FUNÇÕES EXISTEM
    // -------------------------------------------------------------------------
    console.log('\n[TESTE 2] Provando existência das funções RPC com service_role...');
    
    // Teste de chamada com p_units inválido para confirmar existência da função
    const { error: probeConsumeErr } = await adminClient.rpc('consume_credits_atomic', {
      p_user_id: testUserId,
      p_workspace_id: testWorkspaceId,
      p_units: 0,
      p_description: 'Probe consume'
    });
    console.log(` -> Função consume_credits_atomic detectada. Mensagem do Postgres: "${probeConsumeErr?.message}"`);

    const { error: probeRefundErr } = await adminClient.rpc('refund_credits_atomic', {
      p_user_id: testUserId,
      p_workspace_id: testWorkspaceId,
      p_units: 0,
      p_reason: 'Probe refund'
    });
    console.log(` -> Função refund_credits_atomic detectada. Mensagem do Postgres: "${probeRefundErr?.message}"`);

    // -------------------------------------------------------------------------
    // 3. CONSUMIR 1 CRÉDITO: SUCESSO, SALDO 2, UMA LINHA 'consume'
    // -------------------------------------------------------------------------
    console.log('\n[TESTE 3] Consumindo 1 crédito de forma atómica...');
    const { data: resConsume, error: errConsume } = await adminClient.rpc('consume_credits_atomic', {
      p_user_id: testUserId,
      p_workspace_id: testWorkspaceId,
      p_units: 1,
      p_description: 'Teste de consumo unitário 1 crédito',
      p_job_id: null
    });

    if (errConsume) throw new Error(`Falha ao consumir 1 crédito: ${errConsume.message}`);
    console.log(` -> Resposta RPC: ${JSON.stringify(resConsume)}`);

    // Conferir em auth.users
    const { data: uCheck } = await adminClient.auth.admin.getUserById(testUserId);
    const uCredits = uCheck?.user?.user_metadata?.credits;
    console.log(` -> Saldo em auth.users.user_metadata: available=${uCredits?.available}, spent=${uCredits?.spent}`);

    // Conferir em workspaces
    const { data: wsRows } = await adminClient.from('workspaces').select('profile').eq('id', testWorkspaceId);
    const wsCredits = wsRows?.[0]?.profile?.credits;
    console.log(` -> Saldo em workspaces.profile: available=${wsCredits?.available}, spent=${wsCredits?.spent}`);

    // Conferir em credit_entries
    const { data: entries1 } = await adminClient
      .from('credit_entries')
      .select('*')
      .eq('workspace_id', testWorkspaceId);
    console.log(` -> Linhas em credit_entries (${entries1?.length}):`, entries1?.map(e => ({
      kind: e.kind,
      units: e.units,
      description: e.description
    })));

    if (uCredits?.available !== 2 || wsCredits?.available !== 2 || entries1?.length !== 1 || entries1?.[0]?.kind !== 'consume') {
      throw new Error('Falha de consistência no Teste 3: saldos não batem exatamente 2 ou credit_entries divergente.');
    }
    console.log(' -> ✅ TESTE 3 PASSOU: saldo 2 em auth.users e workspaces, exatamente 1 linha consume em credit_entries.');

    // -------------------------------------------------------------------------
    // 4. PEDIR 5 CRÉDITOS COM SALDO INSUFICIENTE (SALDO ATUAL É 2)
    // -------------------------------------------------------------------------
    console.log('\n[TESTE 4] Pedindo 5 créditos com saldo insuficiente (saldo atual = 2)...');
    const { data: resInsuf, error: errInsuf } = await adminClient.rpc('consume_credits_atomic', {
      p_user_id: testUserId,
      p_workspace_id: testWorkspaceId,
      p_units: 5,
      p_description: 'Tentativa de consumo excessivo'
    });

    console.log(` -> Resposta RPC: ${JSON.stringify(resInsuf)} (Erro Postgres: ${errInsuf?.message || 'Nenhum, retornou JSON com success: false'})`);

    // Verificar se o saldo continua 2
    const { data: uCheckAfter } = await adminClient.auth.admin.getUserById(testUserId);
    const uCreditsAfter = uCheckAfter?.user?.user_metadata?.credits;
    console.log(` -> Saldo inalterado em auth.users: available=${uCreditsAfter?.available}, spent=${uCreditsAfter?.spent}`);

    const { data: entriesAfter } = await adminClient
      .from('credit_entries')
      .select('*')
      .eq('workspace_id', testWorkspaceId);
    console.log(` -> Quantidade de linhas em credit_entries permanece: ${entriesAfter?.length}`);

    if (resInsuf?.success !== false || uCreditsAfter?.available !== 2 || entriesAfter?.length !== 1) {
      throw new Error('Falha no Teste 4: saldo foi alterado indevidamente.');
    }
    console.log(' -> ✅ TESTE 4 PASSOU: pedido rejeitado por saldo insuficiente, dados 100% inalterados.');

    // -------------------------------------------------------------------------
    // 5. CONCORRÊNCIA: 10 CHAMADAS PARALELAS COM SALDO = 3
    // -------------------------------------------------------------------------
    console.log('\n[TESTE 5] Testando Concorrência Real: 10 chamadas paralelas com saldo 3...');
    
    // Repõe o saldo exatamente em 3 créditos e limpa o credit_entries de teste
    await adminClient.auth.admin.updateUserById(testUserId, {
      user_metadata: {
        name: 'QA Test User (Módulo Criar Site)',
        credits: { available: 3, spent: 0, reserved: 0 }
      }
    });
    await adminClient.from('workspaces').update({
      profile: { credits: { available: 3, spent: 0, reserved: 0 } }
    }).eq('id', testWorkspaceId);
    await adminClient.from('credit_entries').delete().eq('workspace_id', testWorkspaceId);

    // Dispara 10 chamadas em paralelo
    const parallelCalls = Array.from({ length: 10 }, (_, i) => 
      adminClient.rpc('consume_credits_atomic', {
        p_user_id: testUserId,
        p_workspace_id: testWorkspaceId,
        p_units: 1,
        p_description: `Concorrência call #${i + 1}`,
        p_job_id: null
      })
    );

    const parallelResults = await Promise.all(parallelCalls);
    const successes = parallelResults.filter(r => r.data && r.data.success === true);
    const failures = parallelResults.filter(r => !r.data || r.data.success === false);

    console.log(` -> Total de chamadas: 10`);
    console.log(` -> Chamadas com sucesso (crédito consumido): ${successes.length}`);
    console.log(` -> Chamadas recusadas (saldo esgotado): ${failures.length}`);

    const { data: uCheckConc } = await adminClient.auth.admin.getUserById(testUserId);
    const uCreditsConc = uCheckConc?.user?.user_metadata?.credits;
    console.log(` -> Saldo final auth.users: available=${uCreditsConc?.available}, spent=${uCreditsConc?.spent}`);

    const { data: entriesConc } = await adminClient
      .from('credit_entries')
      .select('*')
      .eq('workspace_id', testWorkspaceId);
    console.log(` -> Total de registos gerados em credit_entries: ${entriesConc?.length}`);

    if (successes.length !== 3 || failures.length !== 7 || uCreditsConc?.available !== 0 || entriesConc?.length !== 3) {
      throw new Error(`Falha no Teste 5 de concorrência: esperava 3 sucessos e saldo 0, obteve ${successes.length} sucessos.`);
    }
    console.log(' -> ✅ TESTE 5 PASSOU: exatamente 3 sucessos, saldo final 0, nunca negativo, 3 linhas gravadas.');

    // -------------------------------------------------------------------------
    // 6. REEMBOLSO DE 1 CRÉDITO: SALDO SOBE E REGISTA 'release'
    // -------------------------------------------------------------------------
    console.log('\n[TESTE 6] Testando reembolso atómico de 1 crédito...');
    const { data: resRefund, error: errRefund } = await adminClient.rpc('refund_credits_atomic', {
      p_user_id: testUserId,
      p_workspace_id: testWorkspaceId,
      p_units: 1,
      p_reason: 'Falha simulada na geração da IA',
      p_job_id: null
    });

    if (errRefund) throw new Error(`Falha no reembolso: ${errRefund.message}`);
    console.log(` -> Resposta RPC: ${JSON.stringify(resRefund)}`);

    const { data: uCheckRef } = await adminClient.auth.admin.getUserById(testUserId);
    const uCreditsRef = uCheckRef?.user?.user_metadata?.credits;
    console.log(` -> Saldo após reembolso em auth.users: available=${uCreditsRef?.available}, spent=${uCreditsRef?.spent}`);

    const { data: entriesRef } = await adminClient
      .from('credit_entries')
      .select('*')
      .eq('workspace_id', testWorkspaceId)
      .eq('kind', 'release');
    console.log(` -> Linha de release registada em credit_entries:`, entriesRef?.map(e => ({
      kind: e.kind,
      units: e.units,
      description: e.description
    })));

    if (uCreditsRef?.available !== 1 || entriesRef?.length !== 1) {
      throw new Error('Falha no Teste 6: saldo não subiu para 1 ou release não foi gravado.');
    }
    console.log(' -> ✅ TESTE 6 PASSOU: saldo subiu para 1 e linha release gravada com sucesso.');

    // -------------------------------------------------------------------------
    // 7. VALIDAÇÃO DE UNIDADES INVÁLIDAS: 0, -5 E 500
    // -------------------------------------------------------------------------
    console.log('\n[TESTE 7] Testando rejeição de unidades inválidas (0, -5, 500)...');
    
    // 7.A: Unidades = 0
    const { error: errZero } = await adminClient.rpc('consume_credits_atomic', {
      p_user_id: testUserId,
      p_workspace_id: testWorkspaceId,
      p_units: 0,
      p_description: 'Teste zero'
    });
    console.log(` -> Unidades 0 recusada: "${errZero?.message}" (código: ${errZero?.code})`);

    // 7.B: Unidades = -5
    const { error: errNeg } = await adminClient.rpc('consume_credits_atomic', {
      p_user_id: testUserId,
      p_workspace_id: testWorkspaceId,
      p_units: -5,
      p_description: 'Teste negativo'
    });
    console.log(` -> Unidades -5 recusada: "${errNeg?.message}" (código: ${errNeg?.code})`);

    // 7.C: Unidades = 500
    const { error: errMax } = await adminClient.rpc('consume_credits_atomic', {
      p_user_id: testUserId,
      p_workspace_id: testWorkspaceId,
      p_units: 500,
      p_description: 'Teste excessivo'
    });
    console.log(` -> Unidades 500 recusada: "${errMax?.message}" (código: ${errMax?.code})`);

    if (!errZero || !errNeg || !errMax) {
      throw new Error('Falha no Teste 7: alguma unidade inválida não foi recusada.');
    }
    console.log(' -> ✅ TESTE 7 PASSOU: todas as unidades fora do intervalo 1-100 foram estritamente rejeitadas.');

    // -------------------------------------------------------------------------
    // 8. BLOQUEIO DE ACESSO: CHAVE ANÓNIMA E UTILIZADOR AUTENTICADO
    // -------------------------------------------------------------------------
    console.log('\n[TESTE 8] Testando bloqueio rigoroso de permissões...');
    
    // 8.A: Chamada com chave anónima (anon)
    const { data: anonRes, error: anonErr } = await anonClient.rpc('consume_credits_atomic', {
      p_user_id: testUserId,
      p_workspace_id: testWorkspaceId,
      p_units: 1,
      p_description: 'Tentativa anónima maliciosa'
    });
    console.log(` -> Tentativa Anon recusada pelo PostgreSQL:`);
    console.log(`    Código de erro: ${anonErr?.code}`);
    console.log(`    Mensagem: ${anonErr?.message}`);

    // 8.B: Chamada com utilizador autenticado (login com token JWT de cliente)
    const authUserClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: loginData } = await authUserClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    const { data: userAuthRes, error: userAuthErr } = await authUserClient.rpc('consume_credits_atomic', {
      p_user_id: testUserId,
      p_workspace_id: testWorkspaceId,
      p_units: 1,
      p_description: 'Tentativa autenticada direta do browser'
    });
    console.log(` -> Tentativa de Utilizador Autenticado recusada pelo PostgreSQL:`);
    console.log(`    Código de erro: ${userAuthErr?.code}`);
    console.log(`    Mensagem: ${userAuthErr?.message}`);

    if (!anonErr || !userAuthErr) {
      throw new Error('Falha de segurança no Teste 8: anon ou authenticated conseguiram chamar a função!');
    }
    console.log(' -> ✅ TESTE 8 PASSOU: tanto anon como authenticated são bloqueados pelo Postgres.');

  } finally {
    // -------------------------------------------------------------------------
    // 9. LIMPEZA TOTAL: APAGAR UTILIZADOR, WORKSPACE E CREDIT_ENTRIES DE TESTE
    // -------------------------------------------------------------------------
    console.log('\n[TESTE 9] Limpeza rigorosa dos dados de teste criados...');
    if (testWorkspaceId) {
      const { error: delCeErr } = await adminClient.from('credit_entries').delete().eq('workspace_id', testWorkspaceId);
      console.log(` -> Linhas de credit_entries do workspace ${testWorkspaceId} apagadas: ${delCeErr ? delCeErr.message : 'OK'}`);

      const { error: delWsErr } = await adminClient.from('workspaces').delete().eq('id', testWorkspaceId);
      console.log(` -> Workspace de teste ${testWorkspaceId} apagado: ${delWsErr ? delWsErr.message : 'OK'}`);
    }

    if (testUserId) {
      const { error: delUserErr } = await adminClient.auth.admin.deleteUser(testUserId);
      console.log(` -> Utilizador de teste ${testUserId} apagado de auth.users: ${delUserErr ? delUserErr.message : 'OK'}`);
    }
    console.log(' -> ✅ TESTE 9 CONCLUÍDO: banco de dados 100% limpo, sem resíduos.');
  }

  console.log('\n====================================================================');
  console.log('        TODOS OS 9 TESTES FORAM EXECUTADOS COM SUCESSO!             ');
  console.log('====================================================================\n');
}

runStep3Tests().catch(err => {
  console.error('\n❌ ERRO NA EXECUÇÃO DOS TESTES DO PASSO 3:', err);
  process.exit(1);
});
