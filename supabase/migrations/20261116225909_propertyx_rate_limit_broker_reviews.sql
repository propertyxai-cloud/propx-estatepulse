-- Limit authenticated broker-review submissions to five per rolling 24-hour window.
CREATE OR REPLACE FUNCTION public.rl_broker_reviews()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.enforce_rate_limit('broker_review',5,interval '24 hours');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.rl_broker_reviews() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_rl_broker_reviews ON public.broker_reviews;
CREATE TRIGGER trg_rl_broker_reviews BEFORE INSERT ON public.broker_reviews FOR EACH ROW EXECUTE FUNCTION public.rl_broker_reviews();
