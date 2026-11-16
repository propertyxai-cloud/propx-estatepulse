-- PropertyXAI intelligence and multi-tenant workspace foundation.
-- User-facing records are scoped by RLS; source-catalog and provider-health
-- records remain server/admin controlled.

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'),
  plan text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','growth','business','enterprise')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can create their organizations"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));
CREATE POLICY "organization creators and members can read organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organizations.id
        AND m.user_id = (select auth.uid())
    )
  );
CREATE POLICY "organization owners can update organizations"
  ON public.organizations FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner','admin','analyst','agent','member','viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id,user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creators can add themselves as owners"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND role = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_members.organization_id
        AND o.created_by = (select auth.uid())
    )
  );
CREATE POLICY "members can read their own memberships"
  ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE TABLE public.ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_type text NOT NULL CHECK (task_type IN (
    'natural_language_search','listing_enrichment','duplicate_detection',
    'fraud_screening','valuation','market_brief','document_review','lead_scoring'
  )),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','completed','failed','cancelled')),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_provider text,
  model_name text,
  prompt_version text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can create their own ai tasks"
  ON public.ai_tasks FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND (
      organization_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = ai_tasks.organization_id
          AND m.user_id = (select auth.uid())
      )
    )
  );
CREATE POLICY "users can read their own ai tasks"
  ON public.ai_tasks FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = ai_tasks.organization_id
          AND m.user_id = (select auth.uid())
      )
    )
  );

CREATE TABLE public.property_intelligence_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN (
    'valuation','investment','rental_yield','market_comparison','due_diligence','neighborhood'
  )),
  country_code char(2),
  currency_code char(3),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
  methodology_version text,
  data_as_of timestamptz,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','completed','failed','needs_review')),
  disclaimer text NOT NULL DEFAULT 'AI-generated estimate, not a formal appraisal, legal opinion, or investment guarantee.',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.property_intelligence_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can create their own intelligence reports"
  ON public.property_intelligence_reports FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = (select auth.uid())
    AND (
      organization_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = property_intelligence_reports.organization_id
          AND m.user_id = (select auth.uid())
      )
    )
  );
CREATE POLICY "users can read their own intelligence reports"
  ON public.property_intelligence_reports FOR SELECT TO authenticated
  USING (
    requested_by = (select auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = property_intelligence_reports.organization_id
          AND m.user_id = (select auth.uid())
      )
    )
  );

CREATE TABLE public.property_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN (
    'licensed_feed','public_registry','partner_api','user_submission','manual_research'
  )),
  country_code char(2),
  terms_url text,
  license_status text NOT NULL DEFAULT 'pending'
    CHECK (license_status IN ('pending','approved','restricted','expired','revoked')),
  permitted_uses text[] NOT NULL DEFAULT '{}'::text[],
  refresh_interval_hours integer CHECK (refresh_interval_hours IS NULL OR refresh_interval_hours > 0),
  last_ingested_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.property_data_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_data_sources FROM anon,authenticated;
GRANT ALL ON public.property_data_sources TO service_role;

CREATE TABLE public.market_observations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  country_code char(2) NOT NULL,
  region text,
  city text NOT NULL,
  neighborhood text,
  property_type text NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('sale','rent','lease')),
  currency_code char(3) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  sample_size integer NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
  median_price numeric,
  median_price_per_sqm numeric,
  median_rent numeric,
  gross_yield numeric,
  source_count integer NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  confidence numeric CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
  provenance jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code,city,neighborhood,property_type,listing_type,currency_code,period_start)
);
ALTER TABLE public.market_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "market observations are readable"
  ON public.market_observations FOR SELECT TO anon,authenticated USING (true);
GRANT SELECT ON public.market_observations TO anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.market_observations_id_seq TO service_role;

CREATE TABLE public.ai_provider_health (
  provider text PRIMARY KEY,
  exhausted_until timestamptz,
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_error text,
  last_success_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_provider_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators can read AI provider health"
  ON public.ai_provider_health FOR SELECT TO authenticated
  USING (public.is_propertyx_admin());
REVOKE ALL ON public.ai_provider_health FROM anon,authenticated;
GRANT ALL ON public.ai_provider_health TO service_role;
