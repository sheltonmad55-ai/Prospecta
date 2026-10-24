-- ============================================================
-- PROSPECTA SAAS - SCHEMA DA AUDITORIA DE ADMIN (admin_audit)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_email TEXT NOT NULL,
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit(admin_id);

ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit' AND policyname = 'Service Role Full Access admin_audit') THEN
    CREATE POLICY "Service Role Full Access admin_audit" ON public.admin_audit FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
