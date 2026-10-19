# Guia de Deploy para Produção (Vercel) — Prospecta SaaS

Este documento detalha o procedimento para publicar o **Prospecta** na **Vercel** com integração Supabase e Google Gemini.

---

## 1. Variáveis de Ambiente na Vercel

No painel do projeto na Vercel (**Settings** > **Environment Variables**), adicione as seguintes variáveis:

| Variável | Valor Recomendado | Descrição |
| :--- | :--- | :--- |
| `PROSPECTA_MODE` | `live` | Ativa o modo real com validação e autenticação Supabase |
| `APP_URL` | `https://prospecta-mz.vercel.app` | Domínio canónico público da aplicação |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://roqpmpbmlvknkmeidkjb.supabase.co` | URL pública do projeto Supabase |
| `SUPABASE_URL` | `https://roqpmpbmlvknkmeidkjb.supabase.co` | URL do projeto Supabase no backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Sua chave anon)* | Chave pública anónima do Supabase |
| `SUPABASE_ANON_KEY` | *(Sua chave anon)* | Chave anónima para operações no backend |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Sua chave service_role)* | Chave administrativa para persistência de workspaces |
| `GEMINI_API_KEY` | *(Sua chave gerada no Google AI Studio)* | Chave de API Google Gemini ativa e validada |
| `GEMINI_MODEL` | `gemini-flash-latest` | Modelo de IA para análise e geração de scripts de vendas |

*(Opcional)*:
* `SERPER_API_KEY`: Para consultas de estabelecimentos via Google Maps Places (caso não configurada, o sistema utiliza o motor OpenStreetMap e sementes verificadas).

---

## 2. Configurações no Supabase

1. **Authentication > URL Configuration:**
   * **Site URL:** `https://prospecta-mz.vercel.app`
   * **Redirect URLs:** Adicione:
     * `https://prospecta-mz.vercel.app/**`
     * `https://prospecta-mz.vercel.app/api/auth/callback`

2. **Authentication > Providers > Google (Opcional para Login com 1 clique):**
   * Ative o fornecedor Google.
   * Insira o **Client ID** e **Client Secret** obtidos no Google Cloud Console.
   * Adicione a URL de callback do Supabase no Google Cloud Console:
     `https://roqpmpbmlvknkmeidkjb.supabase.co/auth/v1/callback`

---

## 3. Comandos de Deploy

### Opção A: Pelo GitHub (Recomendado)
Como o repositório já está sincronizado com `origin/main` no GitHub (`sheltonmad55-ai/Prospecta`), basta:
1. Importar o repositório no painel da Vercel ([vercel.com/new](https://vercel.com/new)).
2. Configurar as variáveis de ambiente descritas acima.
3. Clicar em **Deploy**.

### Opção B: Pelo Terminal com a Vercel CLI
```bash
# 1. Iniciar sessão na Vercel
vercel login

# 2. Publicar em produção
vercel --prod
```

---

## 4. Verificação Pós-Deploy

Após a conclusão da compilação na Vercel:
1. Aceda a `https://prospecta-mz.vercel.app`.
2. Verifique o acesso e o radar de pesquisa de empresas.
3. Teste a funcionalidade **"Analisar oportunidade"** numa empresa para confirmar a geração de scripts via Gemini AI.
