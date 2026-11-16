-- Protect account suspension and identity fields, plus listing ownership,
-- trust signals, paid placement and system-generated metrics from direct client writes.
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE self_selectable text[]:=ARRAY['buyer','seller','investor','agent'];
BEGIN
  IF public.is_propertyx_admin() THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    IF auth.uid() IS NOT NULL THEN NEW.id:=auth.uid(); END IF;
    IF NEW.role IS NULL OR NOT (NEW.role=ANY(self_selectable)) THEN NEW.role:='buyer'; END IF;
    NEW.suspended_at:=NULL; NEW.suspended_reason:=NULL;
    NEW.created_at:=now(); NEW.updated_at:=now();
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.role IS DISTINCT FROM OLD.role
    OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
    OR NEW.suspended_reason IS DISTINCT FROM OLD.suspended_reason
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only a PropertyX administrator can change protected account fields' USING ERRCODE='42501';
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.default_new_listing_moderation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_propertyx_admin() THEN
    IF auth.uid() IS NOT NULL THEN NEW.owner_id:=auth.uid(); NEW.posted_by:=auth.uid(); END IF;
    NEW.verified:=false; NEW.agent_verified:=false; NEW.moderation_status:='pending';
    NEW.moderation_notes:=NULL; NEW.moderated_at:=NULL; NEW.moderated_by:=NULL;
    NEW.featured:=false; NEW.sponsored:=false; NEW.boost_until:=NULL;
    NEW.match_score:=NULL; NEW.view_count:=0; NEW.posted_months_ago:=0;
    NEW.investment_tagged:=false; NEW.badges:=ARRAY[]::text[];
    NEW.valuation_ai:=NULL; NEW.submit_token:=NULL;
    NEW.availability:='available'; NEW.availability_updated_at:=now();
    NEW.created_at:=now(); NEW.updated_at:=now();
    NEW.price_label:=coalesce(nullif(upper(btrim(NEW.currency_code)),''),nullif(upper(btrim(NEW.currency)),''),'USD')||' '||NEW.price::text;
    NEW.status:=CASE WHEN NEW.listing_type IN ('rent','lease') THEN 'for_rent' ELSE 'for_sale' END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_listing_moderation_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_propertyx_admin() THEN
    IF NEW.verified IS DISTINCT FROM OLD.verified
      OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
      OR NEW.moderation_notes IS DISTINCT FROM OLD.moderation_notes
      OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
      OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
      OR NEW.agent_verified IS DISTINCT FROM OLD.agent_verified
      OR NEW.featured IS DISTINCT FROM OLD.featured
      OR NEW.sponsored IS DISTINCT FROM OLD.sponsored
      OR NEW.boost_until IS DISTINCT FROM OLD.boost_until
      OR NEW.match_score IS DISTINCT FROM OLD.match_score
      OR NEW.view_count IS DISTINCT FROM OLD.view_count
      OR NEW.posted_months_ago IS DISTINCT FROM OLD.posted_months_ago
      OR NEW.investment_tagged IS DISTINCT FROM OLD.investment_tagged
      OR NEW.badges IS DISTINCT FROM OLD.badges
      OR NEW.valuation_ai IS DISTINCT FROM OLD.valuation_ai
      OR NEW.submit_token IS DISTINCT FROM OLD.submit_token
      OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
      OR NEW.posted_by IS DISTINCT FROM OLD.posted_by
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.availability_updated_at IS DISTINCT FROM OLD.availability_updated_at THEN
      RAISE EXCEPTION 'Only a PropertyX administrator can change protected listing fields' USING ERRCODE='42501';
    END IF;
    NEW.price_label:=coalesce(nullif(upper(btrim(NEW.currency_code)),''),nullif(upper(btrim(NEW.currency)),''),'USD')||' '||NEW.price::text;
    NEW.updated_at:=now();
  END IF;
  RETURN NEW;
END;
$$;
