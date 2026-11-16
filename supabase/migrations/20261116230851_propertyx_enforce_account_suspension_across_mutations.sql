-- Suspended accounts may still read public marketplace information and request
-- account deletion, but must not create or mutate marketplace records.

CREATE OR REPLACE FUNCTION public.is_propertyx_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND suspended_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.subscriptions s
      JOIN public.profiles pr ON pr.id = s.user_id
     WHERE s.user_id = auth.uid()
       AND pr.suspended_at IS NULL
       AND s.mode = 'live'
       AND (
         s.status IN ('on_trial','active')
         OR (s.status='cancelled' AND s.ends_at IS NOT NULL AND s.ends_at > now())
         OR (s.status='past_due' AND s.renews_at IS NOT NULL AND s.renews_at > now() - interval '3 days')
       )
  );
$$;

CREATE OR REPLACE FUNCTION public.delete_listing(p_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected integer;
BEGIN
  IF public.is_suspended() THEN
    RAISE EXCEPTION 'A suspended account cannot modify marketplace listings'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.properties
   WHERE id = p_property_id
     AND (owner_id = auth.uid() OR posted_by = auth.uid() OR public.is_propertyx_admin())
     AND archived_at IS NOT NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_listing_archived(p_property_id uuid,p_archived boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected integer;
BEGIN
  IF public.is_suspended() THEN
    RAISE EXCEPTION 'A suspended account cannot modify marketplace listings'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.properties
     SET archived_at = CASE WHEN p_archived THEN now() ELSE NULL END
   WHERE id = p_property_id
     AND (owner_id = auth.uid() OR posted_by = auth.uid() OR public.is_propertyx_admin())
     AND (archived_at IS NULL) = p_archived;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_listing_availability(p_property_id uuid,p_availability text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected integer;
BEGIN
  IF public.is_suspended() THEN
    RAISE EXCEPTION 'A suspended account cannot modify marketplace listings'
      USING ERRCODE = '42501';
  END IF;
  IF p_availability NOT IN ('available','under_offer','sold','rented') THEN
    RAISE EXCEPTION 'unsupported availability value: %',p_availability USING ERRCODE='22023';
  END IF;

  UPDATE public.properties
     SET availability = p_availability
   WHERE id = p_property_id
     AND (owner_id = auth.uid() OR posted_by = auth.uid() OR public.is_propertyx_admin())
     AND archived_at IS NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

-- Preserve existing policy scopes while adding a central active-account guard
-- to public-schema INSERT/UPDATE/DELETE operations.
DO $$
DECLARE
  p record;
  roles_sql text;
  using_sql text;
  check_sql text;
  active_guard text := 'NOT EXISTS (SELECT 1 FROM public.profiles px WHERE px.id = (select auth.uid()) AND px.suspended_at IS NOT NULL)';
  stmt text;
BEGIN
  FOR p IN
    SELECT *
      FROM pg_policies
     WHERE schemaname = 'public'
       AND cmd IN ('INSERT','UPDATE','DELETE')
       AND (
         roles @> ARRAY['authenticated']::name[]
         OR roles @> ARRAY['anon']::name[]
         OR roles @> ARRAY['public']::name[]
       )
  LOOP
    SELECT string_agg(quote_ident(r), ', ' ORDER BY ord)
      INTO roles_sql
      FROM unnest(p.roles) WITH ORDINALITY AS x(r,ord);

    using_sql := p.qual;
    check_sql := p.with_check;

    IF using_sql IS NOT NULL THEN
      using_sql := '(' || using_sql || ') AND (' || active_guard || ')';
    END IF;
    IF check_sql IS NOT NULL THEN
      check_sql := '(' || check_sql || ') AND (' || active_guard || ')';
    END IF;

    stmt := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      p.policyname,p.schemaname,p.tablename,lower(p.permissive),p.cmd,roles_sql
    );
    IF using_sql IS NOT NULL THEN stmt := stmt || format(' USING (%s)',using_sql); END IF;
    IF check_sql IS NOT NULL THEN stmt := stmt || format(' WITH CHECK (%s)',check_sql); END IF;

    EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
    EXECUTE stmt;
  END LOOP;
END $$;
