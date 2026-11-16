-- Prevent clients from forging completed AI work, valuation outputs, confidence
-- scores, model provenance, or paid organisational entitlements.
CREATE OR REPLACE FUNCTION public.guard_organization_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.is_propertyx_admin() THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required to create an organization' USING ERRCODE='42501'; END IF;
    NEW.created_by:=auth.uid(); NEW.plan:='starter'; NEW.created_at:=now(); NEW.updated_at:=now();
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.plan IS DISTINCT FROM OLD.plan OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only a PropertyX administrator can change organization identity or plan' USING ERRCODE='42501';
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_ai_task_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.is_propertyx_admin() THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required to submit an AI task' USING ERRCODE='42501'; END IF;
  NEW.user_id:=auth.uid(); NEW.status:='queued'; NEW.output:='{}'::jsonb;
  NEW.model_provider:=NULL; NEW.model_name:=NULL; NEW.prompt_version:=NULL; NEW.error_code:=NULL;
  NEW.created_at:=now(); NEW.started_at:=NULL; NEW.completed_at:=NULL;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_intelligence_report_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
  IF public.is_propertyx_admin() THEN RETURN NEW; END IF;
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication is required to request an intelligence report' USING ERRCODE='42501'; END IF;
  IF NEW.property_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id=NEW.property_id AND (
      (p.moderation_status='approved' AND p.archived_at IS NULL
       AND coalesce(p.availability,'available') IN ('available','under_offer'))
      OR p.owner_id=actor OR p.posted_by=actor
    )
  ) THEN RAISE EXCEPTION 'Property is not available for intelligence analysis' USING ERRCODE='42501'; END IF;
  NEW.requested_by:=actor; NEW.status:='queued'; NEW.result:='{}'::jsonb;
  NEW.confidence:=NULL; NEW.methodology_version:=NULL; NEW.data_as_of:=NULL;
  NEW.completed_at:=NULL;
  NEW.disclaimer:='AI-generated estimate, not a formal appraisal, legal opinion, or investment guarantee.';
  NEW.created_at:=now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_organization_fields ON public.organizations;
CREATE TRIGGER trg_guard_organization_fields BEFORE INSERT OR UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.guard_organization_fields();
DROP TRIGGER IF EXISTS trg_guard_ai_task_submission ON public.ai_tasks;
CREATE TRIGGER trg_guard_ai_task_submission BEFORE INSERT ON public.ai_tasks
FOR EACH ROW EXECUTE FUNCTION public.guard_ai_task_submission();
DROP TRIGGER IF EXISTS trg_guard_intelligence_report_submission ON public.property_intelligence_reports;
CREATE TRIGGER trg_guard_intelligence_report_submission BEFORE INSERT ON public.property_intelligence_reports
FOR EACH ROW EXECUTE FUNCTION public.guard_intelligence_report_submission();

REVOKE ALL ON FUNCTION public.guard_organization_fields() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_ai_task_submission() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_intelligence_report_submission() FROM PUBLIC,anon,authenticated;
