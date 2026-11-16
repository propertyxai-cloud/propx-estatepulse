-- A user cannot approve their own review; only administrators can moderate it.
CREATE OR REPLACE FUNCTION public.moderate_broker_review(
  p_review_id uuid,
  p_decision text,
  p_verified_deal boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE changed integer;
BEGIN
  IF NOT public.is_propertyx_admin() THEN
    RAISE EXCEPTION 'Only a PropertyX administrator can moderate broker reviews'
      USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected' USING ERRCODE = '22023';
  END IF;
  UPDATE public.broker_reviews
     SET moderation_status = p_decision,
         verified_deal = CASE WHEN p_decision = 'approved' THEN coalesce(p_verified_deal,false) ELSE false END
   WHERE id = p_review_id
     AND moderation_status = 'pending';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed > 0 THEN
    INSERT INTO public.audit_logs(actor_id, action, resource_type, resource_id, metadata)
    VALUES (
      auth.uid(), 'broker_review_moderated', 'broker_review', p_review_id,
      jsonb_build_object('decision',p_decision,'verified_deal',coalesce(p_verified_deal,false))
    );
  END IF;
  RETURN changed > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_broker_review(uuid,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_broker_review(uuid,text,boolean) TO authenticated;
CREATE INDEX IF NOT EXISTS broker_reviews_moderation_created_idx
  ON public.broker_reviews(moderation_status, created_at DESC);
