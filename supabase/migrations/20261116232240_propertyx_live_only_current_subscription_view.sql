
CREATE OR REPLACE FUNCTION public.current_plan()
RETURNS TABLE(
  code text,
  name text,
  status text,
  currency character,
  amount_minor bigint,
  billing_interval text,
  renews_at timestamptz,
  ends_at timestamptz,
  cancelled_at timestamptz,
  trial_ends_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.code,cp.name,s.status,s.currency,s.amount_minor,cp.billing_interval,
         s.renews_at,s.ends_at,s.cancelled_at,s.trial_ends_at
  FROM public.subscriptions s
  JOIN public.checkout_products cp ON cp.id=s.plan_id
  JOIN public.profiles pr ON pr.id=s.user_id
  WHERE s.user_id=auth.uid()
    AND s.mode='live'
    AND pr.suspended_at IS NULL
  ORDER BY (s.status IN ('on_trial','active')) DESC,s.created_at DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.current_plan() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.current_plan() TO authenticated;
