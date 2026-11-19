-- Migração de Suporte a Histórico de Mensagens do Chat do Criador de Sites
-- Tabela: site_messages
-- Executar apenas após aprovação do utilizador

CREATE TABLE IF NOT EXISTS public.site_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL REFERENCES public.generated_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sections_changed JSONB DEFAULT '[]'::jsonb,
  credits_consumed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_site_messages_site_id ON public.site_messages(site_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_site_messages_user_id ON public.site_messages(user_id);

-- Ativação de RLS
ALTER TABLE public.site_messages ENABLE ROW LEVEL SECURITY;

-- Política de RLS: o utilizador autenticado só pode ver as suas próprias mensagens
DROP POLICY IF EXISTS "site_messages_select_owner" ON public.site_messages;
CREATE POLICY "site_messages_select_owner"
  ON public.site_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Bloqueio total de escrita direta por clientes (apenas o servidor via service_role insere)
REVOKE ALL ON public.site_messages FROM anon, authenticated;
GRANT SELECT ON public.site_messages TO authenticated;
GRANT ALL ON public.site_messages TO service_role;

