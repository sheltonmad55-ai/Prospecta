# Especificação técnica

## Arquitectura executada

Next.js 16.4.2, React 19.3.1, TypeScript estrito, CSS sem CDN, Lucide, validação Zod e libphonenumber-js. Fontes locais Plus Jakarta Sans, com licença OFL. Aplicação modular com endpoint agrupado `/api/[...path]` e um worker Node separado.

Foi escolhido SQLite nativo do Node 24 para executar sem Docker ou conta externa. WAL, busy timeout, chaves estrangeiras e transacções BEGIN IMMEDIATE protegem as mutações locais. A autorização é aplicada no servidor, com identificador de espaço em todas as consultas privadas. PostgreSQL/Supabase com RLS é uma migração futura preparada em SQL, não a base activa.

## Identidade

Modo demo: palavras-passe protegidas por scrypt com salt individual, tokens de sessão aleatórios armazenados como SHA-256, cookies HttpOnly e SameSite=Lax. Confirmação e recuperação geram tokens de utilização única com prazo. As ligações ficam numa caixa local protegida, não são enviadas por e-mail. No modo real, o adaptador Supabase valida credenciais e revalida o token do fornecedor nos pedidos privados; sessões locais reais duram até uma hora e exigem nova entrada após expiração.

## Tarefas

Pesquisas persistem filtros, zonas, estado e snapshot de IDs; intercalam províncias antes de paginar. O parâmetro budget limita zonas consultadas, **não constitui medição monetária do custo externo**. A consulta ao dataset Apify lê até 500 registos normalizados; não executa um actor nem cobre automaticamente todos os negócios do país.

Análises usam fila persistente, lease de 60 s, até duas tentativas, espera curta e recuperação de tarefas abandonadas. Reserva, criação do job e confirmação do resultado são transaccionais. O guard de estado/tentativa evita finalização por um worker antigo. Chamadas a fornecedores externos podem repetir após crash; não há garantia de execução exactamente uma vez fora da base de dados.

## Integrações

Gemini: adaptador HTTP server-side com esquema estrito, referências de evidência e reconstrução factual a partir da entrada. Não possui ferramentas nem acesso arbitrário a URLs. Dataset Apify: autenticação no servidor, país MZ obrigatório, limites de registos e validação de URL/telefone. Os formatos são descritos em API.md. Não foram utilizadas chaves reais nem testados estes adaptadores ao vivo.

## Limites para produção

Adaptar o repositório PostgreSQL e testar RLS/RPC/worker em staging; validar catálogo geográfico e cobertura; completar retenção/correcção por fonte; instrumentar custos, observabilidade e CI; executar navegador/acessibilidade/carga; configurar correio, HTTPS, backups e administração. O modo demo administrativo nunca deve ser publicado.
