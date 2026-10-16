# Verificação efectivamente realizada

Data: 16 de Outubro de 2026. Ambiente: Windows, Node 24.21.0; sem Docker ou credenciais externas.

## Passou

- TypeScript estrito: sem erros.
- ESLint: sem erros ou avisos na última execução antes da documentação final.
- Build Next.js optimizado: compilação, tipos, geração estática e rotas de API concluídos.
- Cinco testes de domínio passaram, incluindo 30 casos de análise determinística e falha real sem fallback com libertação de crédito; cobrem palavras-passe com salts; 44 resultados em 11 unidades provinciais; paginação estável; localidades fora de capitais; Maputo Cidade separado; contas isoladas; FK composta; leads idempotentes; reserva/consumo/libertação; 25 pedidos para 20 créditos; recovery de lease; persistência ao reabrir a base; validação CSV e URLs/telefones.
- Verificação HTTP inicial: 21 verificações passaram, incluindo autenticação, pesquisa, análise, mensagem persistente, CRM/painel, origem, administração, exportação privada e não contacto.
- Script HTTP reproduzível `npm run test:api`: 17 verificações principais passaram; relatório em test-results/api-validation.json (ficheiro de execução não incluído nos dados de utilizador).

- Interface em DOM simulado: 23 passos passaram com API HTTP real, incluindo registo/onboarding, pesquisa, análise, edição, CRM, painel, conta e administração. O teste não mede layout, renderização de fontes ou comportamento de navegador real.

## Preparado mas não executado/concluído

- Playwright: testes de percurso e registo criados. Chrome falhou ao iniciar neste ambiente com Access denied em IPC/crashpad. Nenhuma captura visual válida foi produzida. Layout, comportamento real em navegador e acessibilidade não são declarados verificados.
- Supabase, Gemini e Apify reais: sem credenciais; nenhum teste ao vivo, consulta paga ou envio realizado.
- PostgreSQL/RLS: SQL preparado, não aplicado nem testado com uma instância real. O runtime usa autorização de servidor e SQLite.
- Backups: procedimento documentado; ensaio de restauro ainda pendente.
- Qualidade de dados reais, cobertura nacional de fornecedores, prova de procura e métricas de piloto: não realizadas.

## Reprodução

Executar typecheck, lint, test e build. Com web/worker activos, executar test:api. Num ambiente que permita Chrome, executar test:e2e e rever desktop/mobile; resultados de DOM simulado, quando existentes, não substituem renderização real.

## Actualização de acesso e Google

Login e cadastro têm páginas completas. Passaram 25 verificações da interface em DOM simulado e 12 verificações HTTP de autenticação. Os testes OAuth cobrem PKCE, ligação ao navegador, expiração, retorno único, consentimento, identidade verificada e atribuição de conta/créditos. O SDK real também gerou a URL Google com prova PKCE num teste sem rede. Não houve autorização de uma conta Google real; activação e testes externos dependem da configuração do fornecedor. Typecheck, lint e build passaram com /login e /cadastro incluídos.
