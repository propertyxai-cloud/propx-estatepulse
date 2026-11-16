-- Serialize quota counting and insertion to prevent parallel requests from
-- racing past per-caller and global AI/form limits.
CREATE OR REPLACE FUNCTION public.consume_ai_quota(
  p_identifier text,p_max integer,p_window interval,p_global_max integer,p_global_window interval
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ident text:=coalesce(nullif(btrim(p_identifier),''),'unknown'); hits integer; global_hits integer;
BEGIN
  IF p_max<1 OR p_global_max<1 OR p_window<=interval '0 seconds' OR p_global_window<=interval '0 seconds' THEN
    RAISE EXCEPTION 'invalid_quota_configuration' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('propertyx:ai:global',0));
  PERFORM pg_advisory_xact_lock(hashtextextended('propertyx:ai:'||ident,0));
  DELETE FROM public.rate_limit_hits WHERE bucket IN ('ai','ai-global') AND created_at<now()-greatest(p_window,p_global_window);
  SELECT count(*) INTO hits FROM public.rate_limit_hits WHERE bucket='ai' AND identifier=ident AND created_at>=now()-p_window;
  IF hits>=p_max THEN RAISE EXCEPTION 'ai_rate_limit_exceeded' USING ERRCODE='P0001',HINT='Too many AI requests from this client. Please wait and try again.'; END IF;
  SELECT count(*) INTO global_hits FROM public.rate_limit_hits WHERE bucket='ai-global' AND created_at>=now()-p_global_window;
  IF global_hits>=p_global_max THEN RAISE EXCEPTION 'ai_global_limit_exceeded' USING ERRCODE='P0001',HINT='The AI service has reached its daily capacity. Please try again later.'; END IF;
  INSERT INTO public.rate_limit_hits(bucket,identifier) VALUES('ai',ident);
  INSERT INTO public.rate_limit_hits(bucket,identifier) VALUES('ai-global','all');
END $$;

CREATE OR REPLACE FUNCTION public.enforce_rate_limit(p_bucket text,p_max integer,p_window interval)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE ident text:=public.request_identifier(); hits integer;
BEGIN
  IF nullif(btrim(p_bucket),'') IS NULL OR p_max<1 OR p_window<=interval '0 seconds' THEN
    RAISE EXCEPTION 'invalid_rate_limit_configuration' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('propertyx:rate:'||p_bucket||':'||ident,0));
  DELETE FROM public.rate_limit_hits WHERE bucket=p_bucket AND created_at<now()-p_window;
  SELECT count(*) INTO hits FROM public.rate_limit_hits WHERE bucket=p_bucket AND identifier=ident AND created_at>=now()-p_window;
  IF hits>=p_max THEN RAISE EXCEPTION 'rate_limit_exceeded' USING ERRCODE='P0001',HINT='Too many submissions from this client. Please wait and try again.'; END IF;
  INSERT INTO public.rate_limit_hits(bucket,identifier) VALUES(p_bucket,ident);
END $$;
