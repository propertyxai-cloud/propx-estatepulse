-- Email addresses must not be auto-confirmed by a database trigger.
-- Supabase Auth should send the configured confirmation email after signup.
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT tg.tgname,n.nspname,c.relname
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid=tg.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE tg.tgfoid='public.auto_confirm_user()'::regprocedure
      AND NOT tg.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I',t.tgname,t.nspname,t.relname);
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.auto_confirm_user();

-- Do not allow a client to forge its own audit-log records.
DROP POLICY IF EXISTS "actor insert audit logs" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM anon, authenticated;
