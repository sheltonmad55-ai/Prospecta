# Estado da entrega — 16 de Outubro de 2026

**Base local funcional implementada. Não é um lançamento comercial pronto.**

O servidor e o worker executam o fluxo demonstrativo persistente. Há registo, perfil, pesquisa nacional, análise simulada, créditos, edição, CRM, seguimentos, administração e exportação. As funcionalidades principais de backend e API foram testadas; tipos, lint e build passaram.

## Pendências concretas

- Executar Playwright e rever visualmente desktop/mobile; o ambiente bloqueou a inicialização do Chrome por permissões de IPC/crashpad.
- Testar correio, confirmação/recuperação e sessões com uma conta Supabase configurada.
- Testar Gemini e dataset Apify com credenciais, formatos, direitos e dados reais.
- Validar fontes/cobertura e catálogo administrativo detalhado; o catálogo actual contém apenas unidades provinciais e dados fictícios.
- Implementar/validar repositório PostgreSQL/RLS e transacções completas antes de adoptar o SQL de destino em produção.
- Completar retenção por fonte, métricas/alertas de custos, observabilidade de produção, testes de carga, recuperação de backup e revisão das políticas públicas.
- Piloto com profissionais reais e decisão de preço. Não há provas de procura, contratos fechados ou cobertura real completa nesta entrega.

## Próximo passo executável

Iniciar servidor e worker, executar `npm run test:e2e` num ambiente com Chrome permitido, abrir a aplicação em telemóvel/computador e rever a experiência. Depois configurar staging e testar uma fonte real e IA sem alterar o âmbito nacional.

Os itens futuros de monetização e expansão constam em POST_MVP_ROADMAP.md. Não reiniciar o projecto nem substituir o backend persistente por uma maquete ao continuar.

## Acesso actualizado

Login e registo agora têm páginas dedicadas e botão Google. O fluxo Google está implementado e testado com fornecedor simulado; faltam configuração do fornecedor e teste real autorizado. Consulte GOOGLE_AUTH.md. O acesso por e-mail no modo local continua funcional.
