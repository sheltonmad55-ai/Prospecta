# Plano e execução

| Marco | Estado |
|---|---|
| Ambiente, stack e decisões | Concluído localmente |
| Persistência SQLite, contas e separação por espaço | Implementado e testado |
| Catálogo demonstrativo nacional, filtros, paginação e worker | Implementado e testado |
| Análise simulada, créditos e edição persistente | Implementado e testado |
| CRM, painel, seguimentos, administração e privacidade | Implementado; verificações de API principais passaram |
| Typecheck, lint e build optimizado | Passaram |
| Navegador real / revisão visual / acessibilidade completa | Pendente: Chrome bloqueado pelo ambiente |
| Supabase, Gemini e Apify com credenciais reais | Adaptadores implementados; testes ao vivo pendentes |
| PostgreSQL/RLS como repositório activo | Fundação SQL preparada; adaptação e testes pendentes |
| Piloto comercial e lançamento público | Ainda não realizados |

O próximo incremento deve executar os testes de navegador num ambiente que permita Chrome, corrigir eventuais problemas visuais, validar autenticação e dados reais em staging e decidir o repositório de produção. Só depois avançar para o piloto com profissionais reais.
