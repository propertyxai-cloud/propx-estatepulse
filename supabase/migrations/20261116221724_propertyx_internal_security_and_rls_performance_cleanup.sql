-- Lock internal operational ledgers to administrators. Edge Functions and cron
-- jobs use the service role / database owner and are not affected.
DROP POLICY IF EXISTS "Administrators can read AI provider health" ON public.ai_provider_health;
CREATE POLICY "Administrators can read AI provider health"
  ON public.ai_provider_health FOR SELECT TO authenticated
  USING (public.is_propertyx_admin());

DROP POLICY IF EXISTS "Administrators can read logical backup snapshots" ON public.backup_snapshots;
CREATE POLICY "Administrators can read logical backup snapshots"
  ON public.backup_snapshots FOR SELECT TO authenticated
  USING (public.is_propertyx_admin());

DROP POLICY IF EXISTS "Administrators can read login attempts" ON public.login_attempts;
CREATE POLICY "Administrators can read login attempts"
  ON public.login_attempts FOR SELECT TO authenticated
  USING (public.is_propertyx_admin());

DROP POLICY IF EXISTS "Administrators can read payment events" ON public.payment_events;
CREATE POLICY "Administrators can read payment events"
  ON public.payment_events FOR SELECT TO authenticated
  USING (public.is_propertyx_admin());

DROP POLICY IF EXISTS "Administrators can read rate limit events" ON public.rate_limit_hits;
CREATE POLICY "Administrators can read rate limit events"
  ON public.rate_limit_hits FOR SELECT TO authenticated
  USING (public.is_propertyx_admin());

REVOKE EXECUTE ON FUNCTION public.check_login_allowed(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_login_attempt(text,boolean) FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS broker_reviews_property_id_idx ON public.broker_reviews(property_id);
CREATE INDEX IF NOT EXISTS broker_reviews_reviewer_id_idx ON public.broker_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON legacy.referrals(referrer_id);

DROP INDEX IF EXISTS public.contact_messages_status_created_idx;
DROP POLICY IF EXISTS "owner select referrals" ON legacy.referrals;

DROP POLICY IF EXISTS "buyer cancel own requested order" ON legacy.deal_requests;
DROP POLICY IF EXISTS "seller advance own orders" ON legacy.deal_requests;
CREATE POLICY "buyer or seller may advance permitted order states"
  ON legacy.deal_requests FOR UPDATE TO authenticated
  USING (
    (((select auth.uid()) = buyer_id) AND status = 'requested')
    OR
    (
      EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = deal_requests.property_id
          AND p.posted_by = (select auth.uid())
      )
      AND status = ANY (ARRAY['requested','confirmed','paid']::text[])
    )
  )
  WITH CHECK (
    (((select auth.uid()) = buyer_id) AND status = 'cancelled')
    OR
    (
      EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = deal_requests.property_id
          AND p.posted_by = (select auth.uid())
      )
      AND status = ANY (ARRAY['confirmed','paid','completed','cancelled']::text[])
    )
  );

DROP POLICY IF EXISTS "Inquirers can read their inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Property owners can read inquiries" ON public.inquiries;
CREATE POLICY "Inquiry participants can read inquiries"
  ON public.inquiries FOR SELECT TO public
  USING (
    (select auth.uid()) = inquirer_id
    OR (select auth.uid()) = user_id
    OR (select auth.uid()) = (
      SELECT p.owner_id FROM public.properties p
      WHERE p.id = inquiries.property_id
    )
  );

DROP POLICY IF EXISTS "Administrators can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their profile" ON public.profiles;
CREATE POLICY "Users and administrators can read profiles"
  ON public.profiles FOR SELECT TO public
  USING (
    (select auth.uid()) = id
    OR (select public.has_permission('user:manage'))
  );

DO $$
DECLARE p record; roles_sql text; using_sql text; check_sql text; stmt text;
BEGIN
  FOR p IN
    SELECT * FROM pg_policies
    WHERE schemaname='legacy'
      AND (
        position('auth.uid()' in coalesce(qual,'')) > 0
        OR position('auth.jwt()' in coalesce(qual,'')) > 0
        OR position('auth.uid()' in coalesce(with_check,'')) > 0
        OR position('auth.jwt()' in coalesce(with_check,'')) > 0
      )
  LOOP
    SELECT string_agg(quote_ident(r), ', ' ORDER BY ord)
      INTO roles_sql
      FROM unnest(p.roles) WITH ORDINALITY AS x(r,ord);
    using_sql := p.qual;
    check_sql := p.with_check;
    IF using_sql IS NOT NULL THEN
      using_sql := replace(using_sql, 'auth.uid()', '(select auth.uid())');
      using_sql := replace(using_sql, 'auth.jwt()', '(select auth.jwt())');
    END IF;
    IF check_sql IS NOT NULL THEN
      check_sql := replace(check_sql, 'auth.uid()', '(select auth.uid())');
      check_sql := replace(check_sql, 'auth.jwt()', '(select auth.jwt())');
    END IF;
    stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      p.policyname, p.schemaname, p.tablename, lower(p.permissive), p.cmd, roles_sql);
    IF using_sql IS NOT NULL THEN stmt := stmt || format(' USING (%s)', using_sql); END IF;
    IF check_sql IS NOT NULL THEN stmt := stmt || format(' WITH CHECK (%s)', check_sql); END IF;
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    EXECUTE stmt;
  END LOOP;
END $$;
