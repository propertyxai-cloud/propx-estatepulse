-- Add supporting indexes for the PROPERTYXAI intelligence foundation.
create index if not exists idx_ai_tasks_organization_id on public.ai_tasks(organization_id);
create index if not exists idx_organization_members_invited_by on public.organization_members(invited_by);
create index if not exists idx_organizations_created_by on public.organizations(created_by);
create index if not exists idx_platform_audit_events_actor_id on public.platform_audit_events(actor_id);
create index if not exists idx_property_intelligence_reports_property_id on public.property_intelligence_reports(property_id);
