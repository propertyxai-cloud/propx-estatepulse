-- Wrap per-request auth lookups in scalar SELECTs so PostgreSQL can evaluate
-- them once per statement rather than once per row.
DO $$
DECLARE p record; roles_sql text; using_sql text; check_sql text; stmt text;
BEGIN
  FOR p IN
    SELECT * FROM pg_policies
    WHERE schemaname='public'
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
