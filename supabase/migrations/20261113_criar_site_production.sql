-- ====================================================================
-- MIGRAÇÃO SUPABASE: MÓDULO CRIAR SITE (PROSPECTA) - V2 FINAL HARDENED
-- Totalmente idempotente e seguro contra acessos não autorizados.
-- ====================================================================

-- 1. TABELA DE SITES GERADOS (generated_sites)
CREATE TABLE IF NOT EXISTS public.generated_sites (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  niche TEXT NOT NULL DEFAULT 'outro',
  template TEXT NOT NULL DEFAULT 'moderno',
  placeholders_pending INTEGER NOT NULL DEFAULT 0,
  source_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  content JSONB,
  html TEXT,
  is_legacy BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_sites ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'moderno';
ALTER TABLE public.generated_sites ADD COLUMN IF NOT EXISTS placeholders_pending INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_generated_sites_user_id ON public.generated_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_sites_slug ON public.generated_sites(slug);
CREATE INDEX IF NOT EXISTS idx_generated_sites_status ON public.generated_sites(status);
CREATE INDEX IF NOT EXISTS idx_generated_sites_created_at ON public.generated_sites(created_at DESC);

-- 2. TABELA DE VERSÕES (site_versions)
CREATE TABLE IF NOT EXISTS public.site_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL REFERENCES public.generated_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  instructions TEXT NOT NULL DEFAULT '',
  content JSONB,
  html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_versions_site_id ON public.site_versions(site_id);
CREATE INDEX IF NOT EXISTS idx_site_versions_user_id ON public.site_versions(user_id);

-- 3. TABELA DE RATE LIMIT PERSISTENTE (site_rate_limits)
CREATE TABLE IF NOT EXISTS public.site_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_rate_limits_reset_at ON public.site_rate_limits(reset_at);

-- 4. TABELA DE CACHE PERSISTENTE (site_cache)
CREATE TABLE IF NOT EXISTS public.site_cache (
  input_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content JSONB NOT NULL,
  html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_cache_user_id ON public.site_cache(user_id);

-- ====================================================================
-- RLS (ROW LEVEL SECURITY)
-- Todas as escritas passam exclusivamente pelo servidor com service_role.
-- O cliente browser authenticated só tem permissão de leitura (SELECT).
-- O cliente anónimo (anon) tem ZERO permissões.
-- ====================================================================

ALTER TABLE public.generated_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_cache ENABLE ROW LEVEL SECURITY;

-- Remove políticas e views públicas residuais
DROP POLICY IF EXISTS "generated_sites_public_slug_select" ON public.generated_sites;
DROP POLICY IF EXISTS "generated_sites_insert_own" ON public.generated_sites;
DROP POLICY IF EXISTS "generated_sites_update_own" ON public.generated_sites;
DROP POLICY IF EXISTS "generated_sites_delete_own" ON public.generated_sites;
DROP VIEW IF EXISTS public.public_sites;

-- Apenas SELECT permitido ao dono autenticado
DROP POLICY IF EXISTS "generated_sites_select_own" ON public.generated_sites;
CREATE POLICY "generated_sites_select_own" ON public.generated_sites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "site_versions_owner_manage" ON public.site_versions;
DROP POLICY IF EXISTS "site_versions_select_own" ON public.site_versions;
CREATE POLICY "site_versions_select_own" ON public.site_versions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ====================================================================
-- FUNÇÕES RPC ATÓMICAS DE CRÉDITOS (SEGURANÇA MÁXIMA)
-- Executáveis EXCLUSIVAMENTE pelo service_role (servidor).
-- Acesso anon e authenticated totalmente revogado.
-- ====================================================================

-- Remove assinaturas antigas/sobrecarregadas para evitar ambiguidade no Postgres
DROP FUNCTION IF EXISTS public.consume_credits_atomic(UUID, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.refund_credits_atomic(UUID, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.consume_credits_atomic(UUID, UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.refund_credits_atomic(UUID, UUID, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.consume_credits_atomic(
  p_user_id UUID,
  p_workspace_id UUID,
  p_units INTEGER,
  p_description TEXT,
  p_job_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_current_avail INTEGER;
  v_current_spent INTEGER;
  v_user_meta JSONB;
  v_new_avail INTEGER;
  v_new_spent INTEGER;
  v_job_uuid UUID := NULL;
BEGIN
  -- 1. Validação estrita dos argumentos de entrada
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'ID de utilizador obrigatório.';
  END IF;

  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'ID de workspace obrigatório.';
  END IF;

  IF p_units IS NULL OR p_units < 1 OR p_units > 100 THEN
    RAISE EXCEPTION 'Quantidade de unidades inválida (deve estar entre 1 e 100): %', p_units;
  END IF;

  -- Converte job_id em UUID seguro se fornecido e no formato correto; caso contrário mantém NULL
  IF p_job_id IS NOT NULL THEN
    BEGIN
      v_job_uuid := p_job_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_job_uuid := NULL;
    END;
  END IF;

  -- 2. Bloqueio exclusivo da linha em auth.users contra concorrência
  SELECT raw_user_meta_data INTO v_user_meta
  FROM auth.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilizador não encontrado: %', p_user_id;
  END IF;

  v_current_avail := COALESCE((v_user_meta->'credits'->>'available')::INTEGER, 0);
  v_current_spent := COALESCE((v_user_meta->'credits'->>'spent')::INTEGER, 0);

  IF v_current_avail < p_units THEN
    RETURN jsonb_build_object('success', false, 'error', 'Créditos insuficientes', 'available', v_current_avail);
  END IF;

  v_new_avail := v_current_avail - p_units;
  v_new_spent := v_current_spent + p_units;

  -- 3. Atualiza user_metadata em auth.users
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{credits,available}', to_jsonb(v_new_avail)),
    '{credits,spent}', to_jsonb(v_new_spent)
  )
  WHERE id = p_user_id;

  -- 4. Atualiza profile em workspaces estritamente para o workspace em causa
  UPDATE public.workspaces
  SET profile = jsonb_set(
    jsonb_set(COALESCE(profile::jsonb, '{}'::jsonb), '{credits,available}', to_jsonb(v_new_avail)),
    '{credits,spent}', to_jsonb(v_new_spent)
  )
  WHERE id = p_workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace não encontrado (workspace_id: %)', p_workspace_id;
  END IF;

  -- 5. Regista a movimentação na tabela existente credit_entries
  INSERT INTO public.credit_entries (id, workspace_id, job_id, kind, units, description, created_at)
  VALUES (gen_random_uuid(), p_workspace_id, v_job_uuid, 'consume', p_units, p_description, now());

  RETURN jsonb_build_object('success', true, 'available', v_new_avail, 'spent', v_new_spent);
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_credits_atomic(
  p_user_id UUID,
  p_workspace_id UUID,
  p_units INTEGER,
  p_reason TEXT,
  p_job_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_current_avail INTEGER;
  v_current_spent INTEGER;
  v_user_meta JSONB;
  v_new_avail INTEGER;
  v_new_spent INTEGER;
  v_job_uuid UUID := NULL;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'ID de utilizador obrigatório.';
  END IF;

  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'ID de workspace obrigatório.';
  END IF;

  IF p_units IS NULL OR p_units < 1 OR p_units > 100 THEN
    RAISE EXCEPTION 'Quantidade de unidades inválida para reembolso (1 a 100): %', p_units;
  END IF;

  IF p_job_id IS NOT NULL THEN
    BEGIN
      v_job_uuid := p_job_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_job_uuid := NULL;
    END;
  END IF;

  SELECT raw_user_meta_data INTO v_user_meta
  FROM auth.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilizador não encontrado: %', p_user_id;
  END IF;

  v_current_avail := COALESCE((v_user_meta->'credits'->>'available')::INTEGER, 0);
  v_current_spent := COALESCE((v_user_meta->'credits'->>'spent')::INTEGER, 0);

  v_new_avail := v_current_avail + p_units;
  v_new_spent := GREATEST(0, v_current_spent - p_units);

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{credits,available}', to_jsonb(v_new_avail)),
    '{credits,spent}', to_jsonb(v_new_spent)
  )
  WHERE id = p_user_id;

  UPDATE public.workspaces
  SET profile = jsonb_set(
    jsonb_set(COALESCE(profile::jsonb, '{}'::jsonb), '{credits,available}', to_jsonb(v_new_avail)),
    '{credits,spent}', to_jsonb(v_new_spent)
  )
  WHERE id = p_workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace não encontrado (workspace_id: %)', p_workspace_id;
  END IF;

  INSERT INTO public.credit_entries (id, workspace_id, job_id, kind, units, description, created_at)
  VALUES (gen_random_uuid(), p_workspace_id, v_job_uuid, 'release', p_units, 'Reembolso: ' || p_reason, now());

  RETURN jsonb_build_object('success', true, 'available', v_new_avail, 'spent', v_new_spent);
END;
$$;

-- Bloqueio rigoroso de execução: revoga de anon e authenticated, concede só a service_role
REVOKE ALL ON FUNCTION public.consume_credits_atomic(UUID, UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits_atomic(UUID, UUID, INTEGER, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.refund_credits_atomic(UUID, UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credits_atomic(UUID, UUID, INTEGER, TEXT, TEXT) TO service_role;

-- ====================================================================
-- BUCKET DE IMAGENS (site-assets)
-- Os uploads são realizados 100% pelo servidor via /api/site/upload com service_role
-- após validação estrita de plano, quota, tipos de ficheiro e tamanho.
-- ====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets',
  'site-assets',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- Remove todas as políticas de cliente em storage.objects
DROP POLICY IF EXISTS "site_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "site_images_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "site_images_owner_update_delete" ON storage.objects;
