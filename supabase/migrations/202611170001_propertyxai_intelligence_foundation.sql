-- PROPERTYXAI intelligence foundation
-- Additive migration. Existing marketplace tables are preserved.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'),
  plan text not null default 'starter' check (plan in ('starter','growth','business','enterprise')),
  created_by uuid not null references auth.users(id) on delete restrict,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','analyst','agent','member','viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create table if not exists public.property_intelligence_reports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  report_type text not null check (report_type in ('valuation','investment','rental_yield','market_comparison','due_diligence','neighborhood')),
  country_code char(2), currency_code char(3),
  inputs jsonb not null default '{}'::jsonb, result jsonb not null default '{}'::jsonb,
  confidence numeric(5,2) check (confidence is null or confidence between 0 and 100),
  methodology_version text, data_as_of timestamptz,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','needs_review')),
  disclaimer text not null default 'AI-generated estimate, not a formal appraisal, legal opinion, or investment guarantee.',
  created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.ai_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  task_type text not null check (task_type in ('natural_language_search','listing_enrichment','duplicate_detection','fraud_screening','valuation','market_brief','document_review','lead_scoring')),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  input jsonb not null default '{}'::jsonb, output jsonb not null default '{}'::jsonb,
  model_provider text, model_name text, prompt_version text, error_code text,
  created_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz
);
create table if not exists public.market_observations (
  id bigint generated always as identity primary key,
  country_code char(2) not null, region text, city text not null, neighborhood text,
  property_type text not null,
  listing_type text not null check (listing_type in ('sale','rent','lease')),
  currency_code char(3) not null, period_start date not null, period_end date not null,
  sample_size integer not null default 0 check (sample_size >= 0),
  median_price numeric, median_price_per_sqm numeric, median_rent numeric, gross_yield numeric,
  source_count integer not null default 0 check (source_count >= 0),
  confidence numeric(5,2) check (confidence is null or confidence between 0 and 100),
  provenance jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(),
  unique (country_code, city, neighborhood, property_type, listing_type, currency_code, period_start)
);
create table if not exists public.property_data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check (source_type in ('licensed_feed','public_registry','partner_api','user_submission','manual_research')),
  country_code char(2), terms_url text,
  license_status text not null default 'pending' check (license_status in ('pending','approved','restricted','expired','revoked')),
  permitted_uses text[] not null default '{}',
  refresh_interval_hours integer check (refresh_interval_hours is null or refresh_interval_hours > 0),
  last_ingested_at timestamptz, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.platform_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  event_type text not null, resource_type text, resource_id text, request_id text,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_intel_reports_user_created on public.property_intelligence_reports(requested_by, created_at desc);
create index if not exists idx_intel_reports_org_created on public.property_intelligence_reports(organization_id, created_at desc);
create index if not exists idx_ai_tasks_user_created on public.ai_tasks(user_id, created_at desc);
create index if not exists idx_ai_tasks_status_created on public.ai_tasks(status, created_at);
create index if not exists idx_market_observations_geo_period on public.market_observations(country_code, city, period_start desc);
create index if not exists idx_audit_org_created on public.platform_audit_events(organization_id, created_at desc);
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.property_intelligence_reports enable row level security;
alter table public.ai_tasks enable row level security;
alter table public.market_observations enable row level security;
alter table public.property_data_sources enable row level security;
alter table public.platform_audit_events enable row level security;
drop policy if exists "organization creators and members can read organizations" on public.organizations;
create policy "organization creators and members can read organizations" on public.organizations for select to authenticated using (
 created_by = (select auth.uid()) or exists (select 1 from public.organization_members m where m.organization_id = organizations.id and m.user_id = (select auth.uid()))
);
drop policy if exists "authenticated users can create their organizations" on public.organizations;
create policy "authenticated users can create their organizations" on public.organizations for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists "organization owners can update organizations" on public.organizations;
create policy "organization owners can update organizations" on public.organizations for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
drop policy if exists "members can read their own memberships" on public.organization_members;
create policy "members can read their own memberships" on public.organization_members for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "creators can add themselves as owners" on public.organization_members;
create policy "creators can add themselves as owners" on public.organization_members for insert to authenticated with check (
 user_id = (select auth.uid()) and role = 'owner' and exists (select 1 from public.organizations o where o.id = organization_id and o.created_by = (select auth.uid()))
);
drop policy if exists "users can read their own intelligence reports" on public.property_intelligence_reports;
create policy "users can read their own intelligence reports" on public.property_intelligence_reports for select to authenticated using (
 requested_by = (select auth.uid()) or (organization_id is not null and exists (select 1 from public.organization_members m where m.organization_id = property_intelligence_reports.organization_id and m.user_id = (select auth.uid()))
));
drop policy if exists "users can create their own intelligence reports" on public.property_intelligence_reports;
create policy "users can create their own intelligence reports" on public.property_intelligence_reports for insert to authenticated with check (
 requested_by = (select auth.uid()) and (organization_id is null or exists (select 1 from public.organization_members m where m.organization_id = property_intelligence_reports.organization_id and m.user_id = (select auth.uid())))
);
drop policy if exists "users can read their own ai tasks" on public.ai_tasks;
create policy "users can read their own ai tasks" on public.ai_tasks for select to authenticated using (
 user_id = (select auth.uid()) or (organization_id is not null and exists (select 1 from public.organization_members m where m.organization_id = ai_tasks.organization_id and m.user_id = (select auth.uid()))
));
drop policy if exists "users can create their own ai tasks" on public.ai_tasks;
create policy "users can create their own ai tasks" on public.ai_tasks for insert to authenticated with check (
 user_id = (select auth.uid()) and (organization_id is null or exists (select 1 from public.organization_members m where m.organization_id = ai_tasks.organization_id and m.user_id = (select auth.uid())))
);
drop policy if exists "market observations are readable" on public.market_observations;
create policy "market observations are readable" on public.market_observations for select to anon, authenticated using (true);
drop policy if exists "audit actors can read own events" on public.platform_audit_events;
create policy "audit actors can read own events" on public.platform_audit_events for select to authenticated using (
 actor_id = (select auth.uid()) or (organization_id is not null and exists (select 1 from public.organization_members m where m.organization_id = platform_audit_events.organization_id and m.user_id = (select auth.uid()))
);
revoke all on public.property_data_sources from anon, authenticated;
revoke insert, update, delete on public.market_observations from anon, authenticated;
revoke insert, update, delete on public.platform_audit_events from anon, authenticated;
grant select on public.market_observations to anon, authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, insert on public.organization_members to authenticated;
grant select, insert on public.property_intelligence_reports to authenticated;
grant select, insert on public.ai_tasks to authenticated;
grant select on public.platform_audit_events to authenticated;
