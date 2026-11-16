-- PropertyX production hardening: additive and backwards-compatible changes.

ALTER FUNCTION public.stamp_availability() SET search_path = pg_catalog;
ALTER FUNCTION public.sync_archive_availability() SET search_path = pg_catalog;
ALTER FUNCTION public.login_failure_limit() SET search_path = pg_catalog;
ALTER FUNCTION public.login_lockout_seconds() SET search_path = pg_catalog;

-- Trigger functions are database-internal, not browser RPC endpoints.
REVOKE ALL ON FUNCTION public.stamp_listing_report_resolution() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_inquiry_recipient() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.default_new_listing_moderation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rl_inquiries() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_listing_moderation_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stamp_listing_moderation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_deal_request_transition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_deal_request_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_inquiry_integrity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rl_contact_messages() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_property_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_inquiry_received() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_inquiry_status_changed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rl_listing_reports() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_confirm_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rl_error_events() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_propertyx_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_suspended() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_entitlement(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription() FROM anon;

-- Audit history is private to administrators.
DROP POLICY IF EXISTS "Authenticated users can read audit trail" ON public.audit_trail;
CREATE POLICY "Administrators can read audit trail"
  ON public.audit_trail FOR SELECT TO authenticated
  USING (public.is_propertyx_admin());

DROP POLICY IF EXISTS "owner delete favorites" ON public.favorites;
DROP POLICY IF EXISTS "owner insert favorites" ON public.favorites;
DROP POLICY IF EXISTS "owner select favorites" ON public.favorites;
DROP POLICY IF EXISTS "owner delete saved_searches" ON public.saved_searches;
DROP POLICY IF EXISTS "owner insert saved_searches" ON public.saved_searches;
DROP POLICY IF EXISTS "owner select saved_searches" ON public.saved_searches;
DROP POLICY IF EXISTS "owner update saved_searches" ON public.saved_searches;

DROP INDEX IF EXISTS public.idx_properties_city2;
DROP INDEX IF EXISTS public.checkout_products_code_unique;

CREATE INDEX IF NOT EXISTS payment_orders_product_id_idx ON public.payment_orders(product_id);
CREATE INDEX IF NOT EXISTS subscriptions_plan_id_idx ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS investments_investor_id_idx ON public.investments(investor_id);
CREATE INDEX IF NOT EXISTS investments_property_id_idx ON public.investments(property_id);
CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS property_alerts_user_id_idx ON public.property_alerts(user_id);
CREATE INDEX IF NOT EXISTS recently_viewed_property_id_idx ON public.recently_viewed(property_id);
CREATE INDEX IF NOT EXISTS payment_events_order_id_idx ON public.payment_events(order_id);

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS country_code char(2),
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS city_code text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS currency_code char(3);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='properties_country_code_iso2_chk') THEN
    ALTER TABLE public.properties ADD CONSTRAINT properties_country_code_iso2_chk
      CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='properties_currency_code_iso3_chk') THEN
    ALTER TABLE public.properties ADD CONSTRAINT properties_currency_code_iso3_chk
      CHECK (currency_code IS NULL OR currency_code ~ '^[A-Z]{3}$') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='properties_timezone_nonempty_chk') THEN
    ALTER TABLE public.properties ADD CONSTRAINT properties_timezone_nonempty_chk
      CHECK (timezone IS NULL OR length(btrim(timezone)) BETWEEN 1 AND 100) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS properties_country_city_idx
  ON public.properties(country_code, city)
  WHERE moderation_status='approved' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS properties_type_price_idx
  ON public.properties(listing_type, property_type, price)
  WHERE moderation_status='approved' AND archived_at IS NULL;

UPDATE storage.buckets
   SET file_size_limit = 15728640,
       allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/avif']
 WHERE id = 'property-images';

DROP POLICY IF EXISTS "owner update property images" ON storage.objects;
CREATE POLICY "owner update property images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='property-images' AND owner = (select auth.uid()))
  WITH CHECK (bucket_id='property-images' AND owner = (select auth.uid()));
