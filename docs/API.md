# API

JSON em /api; sessão em cookie HttpOnly. Erros devolvem {error:string}. Mutações recusam Origin externo e pedidos cross-site; entradas são validadas com Zod. Nunca confiar em um workspace enviado pelo navegador.

| Rota | Método | Função |
|---|---|---|
| health / me | GET | Saúde e conta/capacidades |
| auth/register, login, demo, logout | POST | Identidade; demo apenas modo local |
| auth/recover, reset, confirm | POST | Tokens/fornecedor de autenticação |
| profile | GET / PUT | Perfil comercial |
| locations | GET | Catálogo inicial provincial |
| searches | POST | Iniciar consulta |
| searches/:id?page=n | GET | Estado, tarefas e snapshot paginado |
| businesses/:id | GET | Catálogo, análise e lead privado |
| analyses | POST | Requer Idempotency-Key; businessId, tone, service, fresh |
| jobs/:id | GET | Estado e resultado privado |
| jobs/:id/cancel | POST | Cancelar e libertar reserva |
| drafts/:analysisId | PATCH | Guardar body editado |
| leads | GET / POST | Listar ou guardar businessId sem duplicar |
| leads/:id | PATCH | stage, note, nextAction, nextActionAt, amountMinor |
| leads/:id/activities | POST | Actividade explicitamente reportada |
| usage / outbox | GET | Utilização ou caixa de mensagens local |
| suppressions / corrections | POST | Não contacto e correcção |
| privacy | GET / POST | Consultar/pedir export ou delete |
| privacy/:id/export | GET | Download JSON autorizado |
| admin | GET | Resumo reservado ao administrador |
| admin/import, admin/grant | POST | CSV autorizado e atribuição auditada |
| admin/corrections/:id/complete | POST | Marcar revisão |
| admin/privacy/:id/complete | POST | Processar pedido |

## CSV

Obrigatórias: name, category, province, locality, sourceId. Opcionais: phone, website, countryCode, description. Cabeçalho e campos separados por vírgula; aspas escapadas suportadas. Até 500 linhas. País, se indicado, MZ; província deve corresponder ao catálogo; telefone válido e URL HTTP(S). O operador confirma direitos e indica a fonte. Reimportar a mesma fonte/sourceId actualiza o registo.

## Dataset Apify normalizado

O adaptador lê um dataset já preparado e autorizado; **não executa um scraper nem activa um actor**. Cada item exige name, category, province, locality, countryCode="MZ", source, sourceId e observedAt (ISO). phone, website e description são opcionais. Até 500 itens por consulta. Não há paginação de datasets maiores nesta versão; preparar uma amostra dentro do limite ou ampliar o adaptador com controlo de custos e testes.

## IA

Saída: facts[{text,evidenceIds}], hypotheses[], recommendedService, reason, missingData[], draftMessage, confidence. O servidor rejeita referências inexistentes e reconstrói o texto factual com evidências. A versão demonstrativa não chama LLM. O adaptador Gemini real ainda precisa de credenciais e avaliação de conteúdo real.
