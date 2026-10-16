# Prospecta

Aplicação de prospecção B2B para todo Moçambique. Interface em português, identidade azul e dados privados persistentes no servidor.

## Executar localmente

Requisitos: Node.js 24 ou superior e npm. Na pasta do projecto:

```text
npm ci
npm run dev
```

Num segundo terminal, na mesma pasta:

```text
npm run worker
```

Abra http://127.0.0.1:4317 e escolha **Explorar demonstração**, ou crie uma conta própria. Cada entrada na demonstração cria um espaço independente com 20 créditos e permissão administrativa de teste. A aplicação escuta apenas na interface local.

No Windows, `scripts/start-local.ps1` inicia servidor e processador em segundo plano. Não exponha a demonstração com acesso administrativo na internet.

## O que funciona

- Registo, entrada, recuperação/confirmação local por tokens e encerramento da sessão.
- Perfil comercial e configuração inicial.
- 44 empresas fictícias, distribuídas pelas 11 unidades provinciais; pesquisa por zona, localidade e categoria, modo nacional e paginação estável.
- Análise determinística explicitamente simulada, mensagem editável persistente e gestão de créditos com reserva, consumo e libertação.
- Oportunidades, etapas, notas, montantes, seguimentos, histórico e painel calculado a partir dos dados guardados.
- Importação CSV validada, atribuição de créditos auditada e revisão de pedidos na administração.
- Pedidos de não contacto, sinalização de correcções e exportação dos dados privados.

Os negócios fictícios não têm números de telefone: evita-se abrir conversas com contactos inventados. Em registos autorizados com telefone válido, a abordagem apresenta o acesso manual ao WhatsApp. Nunca envia mensagens automaticamente nem confirma a existência da conta WhatsApp.

## Dados e modos

Por predefinição, os dados ficam em `data/prospecta.sqlite`, com WAL e chaves estrangeiras. A interface não utiliza localStorage como base de dados. O servidor e o worker devem usar o mesmo `PROSPECTA_DB_PATH`.

Copie `.env.example` para `.env.local` para configurar outro ambiente. O modo `live` tem adaptadores implementados para autenticação Supabase, IA Gemini e dataset normalizado Apify; também aceita importação CSV autorizada. Estas integrações **não foram testadas ao vivo**, porque não foram fornecidas credenciais. O modo real não muda automaticamente para resultados simulados quando faltam chaves.

O repositório de dados em execução continua SQLite mesmo com autenticação real. `supabase/migrations/` prepara uma base PostgreSQL/RLS de destino, mas não substitui automaticamente o repositório nem representa um backend de produção concluído. Leia `docs/STATUS.md` e `docs/OPERATIONS.md` antes de publicar.

## Verificar

```text
npm run typecheck
npm run lint
npm test
npm run build
```

Com servidor e worker iniciados:

```text
npm run test:api
npm run test:dom
npm run test:landing
npm run test:auth
npm run test:auth-api
npm run test:e2e
```

Os testes de navegador precisam de Chrome e autorização para iniciar os seus processos. O ambiente de construção bloqueou o Chrome por restrições de IPC; por isso não foi possível confirmar visualmente o layout nem executar Playwright neste ambiente. Consulte os resultados efectivamente obtidos em `docs/VALIDATION.md`.

## Produção local

```text
npm run build
npm start
```

Mantenha o worker em execução. O servidor personalizado permite compilar/servir sem o processo intermediário do comando de desenvolvimento. A configuração usa a API do TypeScript e workers em threads, necessários neste ambiente Windows restrito.

## Administração e caixa de mensagens local

Para conceder administração a uma conta existente, apenas pelo operador no servidor:

```text
node --env-file-if-exists=.env.local --experimental-strip-types scripts/admin.ts pessoa@exemplo.com
```

As mensagens locais são visíveis na área Conta. Se perdeu a palavra-passe no modo demonstrativo, o operador pode consultar o token localmente:

```text
node --env-file-if-exists=.env.local --experimental-strip-types scripts/outbox.ts pessoa@exemplo.com
```

Nenhuma ligação de recuperação é devolvida numa resposta pública. No modo real, confirmação e recuperação dependem da configuração de correio do Supabase.

## Evolução

Pagamentos M-Pesa/e-Mola, portfólios públicos, assistente de respostas, propostas, equipas e mensageria oficial são fases seguintes, com critérios de avanço em `docs/POST_MVP_ROADMAP.md`. Não há cobrança, assinatura, envio automático ou integração WhatsApp Business activada nesta entrega.

## Página inicial actualizada

A landing page tem fundo escuro com brilho azul, sete serviços em rotação a cada 2 segundos, contador até +100.000 MT explicitamente identificado como meta, demonstrações do fluxo, recursos, cobertura nacional e perguntas frequentes. Não apresenta planos ou preços. As animações respeitam redução de movimento; o contador inicia ao entrar no viewport. Consulte docs/LANDING_UPDATE.md.

## Login e registo

Páginas dedicadas em /login e /cadastro com o visual azul/escuro. Google OAuth está integrado ao Supabase com PKCE e retorno validado. A activação real exige configurar o fornecedor e as URLs; leia docs/GOOGLE_AUTH.md. No modo demo não é simulado um login Google. Telefone opcional e aceitação dos termos são validados no servidor.
