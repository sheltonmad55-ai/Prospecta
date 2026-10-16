# Operação e passagem para produção

## Local

Web e worker são dois processos Node no mesmo directório e com a mesma base. O comando worker lê .env.local. O servidor escuta em 127.0.0.1:4317. As rotinas do Next usam threads em vez de um processo extra; as verificações de tipos continuam activas.

Proteja a pasta data: contém sessões, hashes, mensagens privadas e, no modo real, tokens de acesso do fornecedor de autenticação. Não coloque esta pasta em public, Git ou pacotes de código. Cada sessão real é validada no Supabase e expira após uma hora; não há refresh automático no browser nesta versão.

## Configuração real em staging

1. Rever o estado e os limites desta entrega. Preferir um ambiente separado, com dados autorizados e utilizadores de teste.
2. Configurar Supabase URL/anon key, correio, URLs de confirmação/recuperação e utilizador administrativo provisionado pelo operador.
3. Escolher/rever o repositório de produção. O SQLite local é funcional mas o SQL Supabase não é ligado automaticamente; implementar e testar a adaptação antes de assumir RLS activo.
4. Configurar Gemini key/model e avaliar pelo menos 30 casos reais, incluindo contradições e tentativas de instrução nas fontes.
5. Importar CSV autorizado ou configurar Apify token/dataset com itens normalizados; confirmar direitos de conservação/exportação e frescura. O adaptador lê até 500 itens; não garante cobertura exaustiva.
6. Aplicar HTTPS e definir APP_URL exacto. Rever cookies, origem/CSRF, limites por utilizador/IP e comportamento atrás de proxy. Não publicar o modo demo administrativo.
7. Executar os testes do navegador, da API, do banco e de carga no ambiente final.

## Saúde, custos e alertas

GET /api/health verifica a conexão local. O painel administrativo lista tarefas, erros e tentativas; logs não imprimem conteúdo dos pedidos. Ainda não há serviço externo de alertas, contabilidade monetária completa por fornecedor ou métricas históricas de custo. Antes de escalar, instrumentar latência, erros, leases expirados, reservas antigas e consumo financeiro; definir budgets no fornecedor e no aplicativo.

O limite de zonas de pesquisa não é um limite em MT. Não anunciar utilização ilimitada. Calcular custos de alojamento, dados, tokens, armazenamento, suporte e cobrança. Os preços não foram verificados para orçamento comercial.

## Backup e recuperação

Para backup local consistente, parar web/worker e copiar prospecta.sqlite e os ficheiros WAL/SHM existentes como conjunto, ou usar a API de backup do SQLite com um operador. Não copiar apenas o ficheiro principal durante escrita activa. Guardar a cópia fora da pasta publicada, com controlo de acesso e prazo de retenção.

Recuperação: parar processos, preservar a base actual, restaurar o conjunto para uma nova pasta, apontar PROSPECTA_DB_PATH, iniciar web/worker e executar testes de saúde e consistência de créditos. O ensaio de recuperação de backup não foi realizado nesta entrega; é gate antes do lançamento.

## Migrações e rollback

SQLite cria o esquema inicial de forma idempotente; futuras alterações exigem novas migrações versionadas, backup e teste. A migração PostgreSQL inicial é uma fundação e não deve ser aplicada como se contivesse todo o backend. Ensaiar migração e reconciliação do ledger em staging. Reverter código apenas com esquema compatível ou restaurar o backup ensaiado; não executar limpezas destrutivas automáticas.

## Privacidade e suporte

Exportações são privadas e imediatas em JSON. Pedidos de eliminação precisam de aprovação administrativa explícita e removem a conta/dados privados por cascade. Definir prazos operacionais e retenção de backups antes do piloto público. Correcções de catálogo devem ser revistas e reimportadas, sem fingir que marcar um pedido como lido já corrigiu a fonte.
