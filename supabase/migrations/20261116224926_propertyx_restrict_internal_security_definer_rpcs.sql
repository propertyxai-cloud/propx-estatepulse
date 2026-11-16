-- These helpers are used only by trusted database triggers. They accept caller
-- supplied identifiers/buckets and must not be callable as browser RPCs.
REVOKE EXECUTE ON FUNCTION public.enforce_rate_limit(text,integer,interval)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wants_inapp_notifications(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_identifier()
  FROM PUBLIC, anon, authenticated;

-- Own-account reads and ownership/permission-checked mutation RPCs remain
-- available to authenticated users.
