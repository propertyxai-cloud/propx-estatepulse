-- Query indexes for asynchronous tasks, workspaces, intelligence reports,
-- market observations and provider circuit-breaker health.
CREATE INDEX idx_ai_tasks_organization_id ON public.ai_tasks(organization_id);
CREATE INDEX idx_ai_tasks_status_created ON public.ai_tasks(status,created_at);
CREATE INDEX idx_ai_tasks_user_created ON public.ai_tasks(user_id,created_at DESC);
CREATE INDEX idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_invited_by ON public.organization_members(invited_by);
CREATE INDEX idx_intel_reports_org_created ON public.property_intelligence_reports(organization_id,created_at DESC);
CREATE INDEX idx_intel_reports_user_created ON public.property_intelligence_reports(requested_by,created_at DESC);
CREATE INDEX idx_property_intelligence_reports_property_id ON public.property_intelligence_reports(property_id);
CREATE INDEX idx_market_observations_geo_period ON public.market_observations(country_code,city,period_start DESC);
CREATE INDEX idx_ai_provider_health_exhausted ON public.ai_provider_health(exhausted_until);
