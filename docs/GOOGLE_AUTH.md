# Login Google e novas páginas de acesso

## O que foi implementado

/login e /cadastro apresentam uma página completa com duas colunas, fundo escuro/brilho azul, explicação do produto e exemplo fictício. Login, registo, recuperação e redefinição de palavra-passe partilham o mesmo desenho. O registo tem telefone opcional com +258, consentimento obrigatório dos termos e comunicações opcionais; a palavra-passe exige pelo menos 10 caracteres.

O botão **Continuar com Google** inicia OAuth pelo Supabase. Não cria uma identidade de demonstração e não inventa um início de sessão quando faltam credenciais.

## Activar o fornecedor real

1. No projecto Supabase, configurar o fornecedor Google em Authentication / Providers, seguindo a documentação oficial. É preciso um cliente OAuth do tipo aplicação web no Google Auth Platform.
2. No cliente Google, registar como URI de redireccionamento autorizado a URL do Supabase indicada pelo próprio painel, normalmente `https://<project-ref>.supabase.co/auth/v1/callback`. Guardar o Client ID e Client Secret no fornecedor Google **no Supabase**, não no frontend nem no repositório.
3. Na configuração de URLs do Supabase, definir o Site URL da Prospecta e autorizar o retorno da aplicação. Para este ambiente: `http://127.0.0.1:4317/api/auth/callback`. Esta URL da aplicação é diferente da URL Supabase registada na consola Google.
4. Definir no servidor `.env.local`: `PROSPECTA_MODE=live`, `APP_URL=http://127.0.0.1:4317`, `SUPABASE_URL` e `SUPABASE_ANON_KEY`. Nunca utilizar uma service-role key como chave pública/anon.
5. Reiniciar web e worker e testar com uma conta de teste. O modo live também activa os adaptadores reais de dados e IA; esses serviços precisam das suas próprias fontes/credenciais ou de CSV autorizado. Não existem resultados simulados silenciosos nesse modo.
6. Em produção, usar HTTPS e actualizar APP_URL e allowlists para as URLs exactas do domínio. Rever o backend/limites pendentes em STATUS.md antes da publicação.

Não partilhe segredos num chat nem os coloque no ZIP de código. Nenhuma conta Google real foi autorizada ou utilizada nesta entrega.

## Fluxo e protecções

- POST /api/auth/google valida a intenção e, no registo, a aceitação dos termos.
- O servidor cria a prova PKCE com o SDK e guarda o verificador numa linha de fluxo por até cinco minutos, associada a cookie HttpOnly/SameSite=Lax.
- GET /api/auth/callback exige o fluxo do mesmo navegador, consome-o uma única vez, troca o código e valida o utilizador no fornecedor.
- A conta local é criada apenas depois da identidade e do e-mail confirmados. Metadata do fornecedor não concede administração. O crédito inicial não é atribuído novamente em cada acesso.
- Um Google ainda sem conta que entra pela opção de login é encaminhado para aceitar os termos do registo. Contas com o mesmo e-mail e identidade diferente não são fundidas silenciosamente.
- Cancelamentos e erros regressam à página de acesso com mensagens fixas. Códigos, tokens e mensagens livres do fornecedor não são mostrados em avisos.

No modo demonstrativo o botão informa que Google ainda não está activado, e o acesso por e-mail continua funcional.

## Verificação

Passaram testes locais de consentimento, PKCE, cookie do navegador, expiração, retorno único, identidade divergente/não confirmada, prevenção de linking silencioso, direitos de utilizador e atribuição única de créditos. O fornecedor foi simulado nesses testes; a troca real de uma conta Google depende das credenciais e configuração acima.

Também passaram 25 verificações da interface em DOM simulado e 12 verificações HTTP específicas. A revisão visual em navegador real continua pendente devido às limitações de ferramentas deste ambiente.

Referências oficiais consultadas: https://supabase.com/docs/guides/auth/social-login/auth-google e https://supabase.com/docs/guides/auth/sessions/pkce-flow.
