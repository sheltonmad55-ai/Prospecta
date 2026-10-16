# Página inicial — 16 de Outubro de 2026

Implementação do prompt aprovado para aproximar a apresentação da referência Clivra, com a identidade azul da Prospecta.

## Entregue

- Fundo escuro #070B14 com brilho azul e pontos de luz discretos.
- Barra arredondada, navegação para funcionamento/recursos/perguntas e acesso aos fluxos existentes de conta.
- Título «Encontre empresas que precisam de» com sete serviços alternados a cada 2 segundos, transição vertical de 440 ms, altura reservada e texto estático acessível a leitores de ecrã.
- Contador com duração de 1,8 s após entrada no viewport, observação desligada após início e valor +100.000 MT. A legenda «A nossa meta» está sempre explícita; não se afirma faturação alcançada.
- Três passos com pré-visualizações de pesquisa, análise e mensagem; secções de contexto, abordagem, recursos, público e cobertura nacional.
- Sete perguntas frequentes com estado expandido, região associada e alternância acessível.
- Convite final, ligações de privacidade/termos e acesso à demonstração.
- Menu móvel com Escape, movimentos reduzidos, limpeza de intervalos/listeners e campos de meta centralizados.
- Sem planos, preços, cobrança, portfólio ou assistente de negociação anunciados como já disponíveis.

## Validação

26 verificações de comportamento passaram em DOM simulado: ciclo completo das sete frases, contador antes/depois de entrada, meta identificada, redução de movimento, limpeza de listeners, FAQ, menu, âncoras e acções de autenticação/demonstração.

23 verificações de regressão do percurso existente passaram com API real: demo, pesquisa, análise, mensagem, CRM, painel, conta, administração, saída, registo e onboarding.

Não foi possível controlar um navegador real com as ferramentas disponíveis. Estes testes não comprovam layout, contraste ou animação visual em dispositivos reais; a revisão visual continua pendente. Os testes de navegador em e2e foram mantidos e adaptados à nova navegação.
