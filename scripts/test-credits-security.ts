import { createClient } from '@supabase/supabase-js';

async function testCreditsSecurity() {
  console.log('=====================================================');
  console.log('  TESTES DE SEGURANÇA E ATOMICIDADE DE CRÉDITOS      ');
  console.log('=====================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl) {
    console.error('SUPABASE_URL não configurada.');
    return;
  }

  const anonClient = createClient(supabaseUrl, anonKey);
  const serviceClient = createClient(supabaseUrl, serviceKey);

  // 1. TESTE DE BLOQUEIO DE ACESSO COM CHAVE ANÓNIMA (ANON)
  console.log('[1] Testando tentativa de chamada com chave anónima (anon)...');
  try {
    const { data, error } = await anonClient.rpc('consume_credits_atomic', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_workspace_id: 'test_ws',
      p_units: 5,
      p_description: 'Teste não autorizado'
    });
    if (error) {
      console.log(`✅ BLOQUEIO CONFIRMADO: Chave anónima rejeitada pelo Postgres: ${error.message} (code: ${error.code})`);
    } else {
      console.error('❌ VULNERABILIDADE: Chave anónima conseguiu chamar a função de créditos!', data);
    }
  } catch (err: any) {
    console.log(`✅ BLOQUEIO CONFIRMADO (exceção): ${err.message}`);
  }

  // 2. TESTE DE VALIDAÇÃO DE UNIDADES (ZERO, NEGATIVAS E EXCESSIVAS)
  console.log('\n[2] Testando validação de limites de unidades...');
  
  // Unidades zero
  try {
    const { data, error } = await serviceClient.rpc('consume_credits_atomic', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_workspace_id: 'test_ws',
      p_units: 0,
      p_description: 'Teste zero'
    });
    if (error) {
      console.log(`✅ Unidades = 0 rejeitadas com sucesso: ${error.message}`);
    } else {
      console.error('❌ Falha: unidades = 0 foi aceite!');
    }
  } catch (err: any) {
    console.log(`✅ Unidades = 0 rejeitadas: ${err.message}`);
  }

  // Unidades negativas
  try {
    const { data, error } = await serviceClient.rpc('consume_credits_atomic', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_workspace_id: 'test_ws',
      p_units: -10,
      p_description: 'Teste negativo'
    });
    if (error) {
      console.log(`✅ Unidades < 0 rejeitadas com sucesso: ${error.message}`);
    } else {
      console.error('❌ Falha: unidades < 0 foi aceite!');
    }
  } catch (err: any) {
    console.log(`✅ Unidades < 0 rejeitadas: ${err.message}`);
  }

  // Unidades acima do limite (>100)
  try {
    const { data, error } = await serviceClient.rpc('consume_credits_atomic', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_workspace_id: 'test_ws',
      p_units: 500,
      p_description: 'Teste excessivo'
    });
    if (error) {
      console.log(`✅ Unidades > 100 rejeitadas com sucesso: ${error.message}`);
    } else {
      console.error('❌ Falha: unidades > 100 foi aceite!');
    }
  } catch (err: any) {
    console.log(`✅ Unidades > 100 rejeitadas: ${err.message}`);
  }

  console.log('\n=====================================================');
  console.log('       TESTES DE SEGURANÇA CONCLUÍDOS!               ');
  console.log('=====================================================\n');
}

testCreditsSecurity().catch(err => {
  console.error('Erro na suite de segurança de créditos:', err);
});

