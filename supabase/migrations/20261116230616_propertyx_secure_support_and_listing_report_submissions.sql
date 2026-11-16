-- Derive support sender identity and moderation fields in the database.
-- New contact messages and listing reports always enter the queue as "new".

CREATE OR REPLACE FUNCTION public.guard_contact_message_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  NEW.user_id:=auth.uid();
  NEW.name:=btrim(coalesce(NEW.name,''));
  NEW.email:=lower(btrim(coalesce(NEW.email,'')));
  NEW.subject:=btrim(coalesce(NEW.subject,''));
  NEW.message:=btrim(coalesce(NEW.message,''));
  IF char_length(NEW.name) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Name must be between 2 and 120 characters' USING ERRCODE='22023'; END IF;
  IF char_length(NEW.email) NOT BETWEEN 3 AND 254 OR NEW.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE='22023'; END IF;
  IF char_length(NEW.subject) NOT BETWEEN 3 AND 120 THEN RAISE EXCEPTION 'Subject must be between 3 and 120 characters' USING ERRCODE='22023'; END IF;
  IF char_length(NEW.message) NOT BETWEEN 20 AND 5000 THEN RAISE EXCEPTION 'Message must be between 20 and 5000 characters' USING ERRCODE='22023'; END IF;
  NEW.status:='new'; NEW.created_at:=now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_listing_report_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor uuid:=auth.uid();
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sign in to report a listing' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id=NEW.property_id AND (
      (p.moderation_status='approved' AND p.archived_at IS NULL AND coalesce(p.availability,'available') IN ('available','under_offer'))
      OR p.owner_id=actor OR p.posted_by=actor
    )
  ) THEN RAISE EXCEPTION 'This property is not available for reporting' USING ERRCODE='22023'; END IF;
  NEW.reporter_id:=actor; NEW.status:='new'; NEW.moderator_notes:=NULL;
  NEW.resolved_by:=NULL; NEW.resolved_at:=NULL; NEW.created_at:=now();
  IF NEW.details IS NOT NULL THEN NEW.details:=btrim(NEW.details); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_contact_message_submission ON public.contact_messages;
CREATE TRIGGER trg_guard_contact_message_submission BEFORE INSERT ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.guard_contact_message_submission();
DROP TRIGGER IF EXISTS trg_guard_listing_report_submission ON public.listing_reports;
CREATE TRIGGER trg_guard_listing_report_submission BEFORE INSERT ON public.listing_reports
FOR EACH ROW EXECUTE FUNCTION public.guard_listing_report_submission();

REVOKE ALL ON FUNCTION public.guard_contact_message_submission() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_listing_report_submission() FROM PUBLIC,anon,authenticated;
