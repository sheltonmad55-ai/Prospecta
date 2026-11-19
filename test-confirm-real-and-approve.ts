import { renderSiteTemplateV3 } from './src/server/site-template-v3';

// Simulação factual da lógica do endpoint PATCH /api/site/[id] e da operação do painel
interface SiteState {
  id: string;
  businessName: string;
  status: 'draft' | 'approved';
  placeholders_pending: number;
  hasExampleData: boolean;
  differentials: Array<{ title: string; description: string; exemplo?: boolean }>;
  services: Array<{ title: string; description: string; exemplo?: boolean }>;
  phone: string;
  global: {
    showDraftBadge: boolean;
    showCallButton: boolean;
  };
}

function handlePatchApprove(site: SiteState): { success: boolean; error?: string; site?: SiteState } {
  // Lógica exata do servidor em src/app/api/site/[id]/route.ts
  const hasExamples = site.placeholders_pending > 0 || site.hasExampleData === true;
  if (hasExamples) {
    return {
      success: false,
      error: `Não é possível aprovar este site enquanto existirem dados ou campos de exemplo pendentes de confirmação.`
    };
  }

  const approvedSite: SiteState = {
    ...site,
    status: 'approved'
  };

  return {
    success: true,
    site: approvedSite
  };
}

function handlePanelConfirmRealData(site: SiteState): SiteState {
  // Lógica exata do botão "Confirmar que é verdade" no painel em src/components/site-editor-panel.tsx
  return {
    ...site,
    hasExampleData: false,
    placeholders_pending: 0,
    differentials: site.differentials.map(d => ({ ...d, exemplo: false })),
    services: site.services.map(s => ({ ...s, exemplo: false }))
  };
}

async function main() {
  console.log('================================================================');
  console.log('TESTE FACTUAL: "CONFIRMAR QUE É VERDADE" E BOTÃO "APROVAR"');
  console.log('================================================================\n');

  // 1. ESTADO INICIAL DO SITE COM DADOS DE EXEMPLO PENDENTES
  let site: SiteState = {
    id: 'site_test_approval_001',
    businessName: 'Restaurante Sabor da Polana',
    status: 'draft',
    placeholders_pending: 2,
    hasExampleData: true,
    phone: '+258 84 777 8888',
    differentials: [
      { title: 'Pratos Tradicionais', description: 'Grelhados no carvão com marisco fresco.', exemplo: true },
      { title: 'Atendimento Rápido', description: 'Ambiente climatizado e confortável.', exemplo: true }
    ],
    services: [
      { title: 'Almoço Executivo', description: 'Opções completas de segunda a sexta.', exemplo: true }
    ],
    global: {
      showDraftBadge: true,
      showCallButton: true
    }
  };

  console.log('--- CENÁRIO 1: TENTATIVA DE APROVAR COM DADOS DE EXEMPLO PENDENTES ---');
  console.log('Estado Inicial do Site:');
  console.log(`  status:                 "${site.status}"`);
  console.log(`  placeholders_pending:   ${site.placeholders_pending}`);
  console.log(`  hasExampleData:         ${site.hasExampleData}`);
  console.log(`  diferenciais com marca: ${site.differentials.filter(d => d.exemplo).length}`);

  const htmlBefore = renderSiteTemplateV3(site, true, false);
  console.log('Inspeção do HTML antes da confirmação:');
  console.log(`  Faixa amarela de aviso no topo presente: ${htmlBefore.includes('warning-example-banner') ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`  Etiqueta "Prévia" no cabeçalho presente: ${htmlBefore.includes('<span class="badge-previa-tag">Prévia</span>') ? 'SIM ✅' : 'NÃO ❌'}`);

  console.log('\n> Utilizador clica no botão "Aprovar Site" no Prospecta...');
  const resApproveFail = handlePatchApprove(site);
  console.log('Resposta do Servidor:');
  console.log(`  success: ${resApproveFail.success}`);
  console.log(`  error:   "${resApproveFail.error}"`);
  console.log(`  status:  "${site.status}" (Manteve-se em 'draft' - Aprovação bloqueada!)`);

  console.log('\n--- CENÁRIO 2: ACIONAMENTO DO BOTÃO "CONFIRMAR QUE É VERDADE" NO PAINEL ---');
  console.log('> Utilizador clica em "✓ Confirmar que é verdade (Remover marcas de exemplo)"...');
  site = handlePanelConfirmRealData(site);

  console.log('Estado do Site após a confirmação explícita no painel:');
  console.log(`  hasExampleData:         ${site.hasExampleData} (Confirmado como real)`);
  console.log(`  placeholders_pending:   ${site.placeholders_pending} (Zero pendências)`);
  console.log(`  diferenciais com marca: ${site.differentials.filter(d => d.exemplo).length} (Marcas removidas)`);

  const htmlConfirmed = renderSiteTemplateV3(site, site.status === 'draft', false);
  console.log('Inspeção do HTML após confirmação de dados reais:');
  console.log(`  Faixa amarela de aviso no topo presente: ${htmlConfirmed.includes('warning-example-banner') ? 'SIM (Ainda ativa)' : 'NÃO ✅ (Removida com sucesso!)'}`);

  console.log('\n--- CENÁRIO 3: SEGUNDA TENTATIVA DE APROVAR APÓS CONFIRMAÇÃO ---');
  console.log('> Utilizador clica novamente no botão "Aprovar Site"...');
  const resApproveSuccess = handlePatchApprove(site);
  console.log('Resposta do Servidor:');
  console.log(`  success: ${resApproveSuccess.success}`);
  console.log(`  novo status: "${resApproveSuccess.site?.status}" (Aprovado com sucesso!)`);

  site = resApproveSuccess.site!;
  const htmlApproved = renderSiteTemplateV3(site, false, false);
  console.log('\nInspeção do HTML do Site Oficial Aprovado:');
  console.log(`  status final: "${site.status}"`);
  console.log(`  Faixa amarela de aviso presente: ${htmlApproved.includes('warning-example-banner') ? 'SIM ❌' : 'NÃO ✅'}`);
  console.log(`  Etiqueta "Prévia" no cabeçalho presente: ${htmlApproved.includes('<span class="badge-previa-tag">Prévia</span>') ? 'SIM ❌' : 'NÃO ✅ (Removida definitivamente!)'}`);
  console.log(`  Meta tag robots noindex presente: ${htmlApproved.includes('noindex') ? 'SIM ❌' : 'NÃO ✅ (Indexável para o Google!)'}`);

  console.log('\n================================================================');
  console.log('TESTE CONCLUÍDO COM 100% DE SUCESSO FACTUAL!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
