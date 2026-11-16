CREATE OR REPLACE FUNCTION public.process_saved_search_alerts(p_frequency text, p_property_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  saved record;
  property record;
  filters jsonb;
  frequency_window interval;
  since_at timestamptz;
  search_term text;
  min_price numeric;
  max_price numeric;
  beds integer;
  baths integer;
  match_count integer := 0;
  inserted integer;
  notification_enabled boolean;
BEGIN
  IF p_frequency NOT IN ('instant','daily','weekly') THEN
    RAISE EXCEPTION 'unsupported_saved_search_frequency' USING ERRCODE='22023';
  END IF;
  IF p_frequency='instant' AND p_property_id IS NULL THEN
    RAISE EXCEPTION 'instant_alert_requires_property_id' USING ERRCODE='22023';
  END IF;

  frequency_window := CASE p_frequency
    WHEN 'daily' THEN interval '1 day'
    WHEN 'weekly' THEN interval '7 days'
    ELSE interval '0 seconds'
  END;

  FOR saved IN
    SELECT ss.*
      FROM public.saved_searches ss
      JOIN public.profiles pr ON pr.id=ss.user_id
     WHERE ss.user_id IS NOT NULL
       AND ss.alert_enabled=true
       AND ss.alert_frequency=p_frequency
       AND pr.suspended_at IS NULL
       AND (
         p_frequency='instant'
         OR (
           (ss.last_alerted_at IS NULL OR ss.last_alerted_at <= now()-frequency_window)
           AND extract(hour FROM (
             now() AT TIME ZONE CASE
               WHEN EXISTS (
                 SELECT 1 FROM pg_timezone_names tz
                 WHERE tz.name=pr.preferred_timezone
               ) THEN pr.preferred_timezone
               ELSE 'UTC'
             END
           ))=8
           AND (
             p_frequency<>'weekly'
             OR extract(isodow FROM (
               now() AT TIME ZONE CASE
                 WHEN EXISTS (
                   SELECT 1 FROM pg_timezone_names tz
                   WHERE tz.name=pr.preferred_timezone
                 ) THEN pr.preferred_timezone
                 ELSE 'UTC'
               END
             ))=1
           )
         )
       )
     ORDER BY ss.created_at
  LOOP
    filters := coalesce(saved.filters,'{}'::jsonb);
    search_term := nullif(btrim(coalesce(filters->>'query',saved.query,'')),'');
    min_price := CASE WHEN coalesce(filters->>'minPrice','') ~ '^[0-9]+(\.[0-9]+)?$'
                      THEN (filters->>'minPrice')::numeric ELSE NULL END;
    max_price := CASE WHEN coalesce(filters->>'maxPrice','') ~ '^[0-9]+(\.[0-9]+)?$'
                      THEN (filters->>'maxPrice')::numeric ELSE NULL END;
    beds := CASE WHEN coalesce(filters->>'beds','') ~ '^[0-9]+$'
                 THEN (filters->>'beds')::integer ELSE NULL END;
    baths := CASE WHEN coalesce(filters->>'baths','') ~ '^[0-9]+$'
                  THEN (filters->>'baths')::integer ELSE NULL END;

    since_at := CASE
      WHEN p_frequency='instant' THEN saved.created_at
      ELSE coalesce(saved.last_alerted_at,saved.created_at)
    END;

    SELECT coalesce(np.inapp_enabled,true)
      INTO notification_enabled
      FROM public.notification_preferences np
     WHERE np.user_id=saved.user_id;
    notification_enabled := coalesce(notification_enabled,true);

    FOR property IN
      SELECT p.*
        FROM public.properties p
       WHERE p.moderation_status='approved'
         AND p.archived_at IS NULL
         AND coalesce(p.availability,'available') IN ('available','under_offer')
         AND (p_property_id IS NULL OR p.id=p_property_id)
         AND coalesce(p.moderated_at,p.updated_at,p.created_at) >= since_at
         AND (nullif(btrim(coalesce(filters->>'city','')),'') IS NULL
              OR p.city ILIKE '%' || btrim(filters->>'city') || '%')
         AND (nullif(btrim(coalesce(filters->>'country','')),'') IS NULL
              OR p.country ILIKE '%' || btrim(filters->>'country') || '%')
         AND (nullif(btrim(coalesce(filters->>'countryCode','')),'') IS NULL
              OR p.country_code=upper(btrim(filters->>'countryCode')))
         AND (nullif(btrim(coalesce(filters->>'currencyCode','')),'') IS NULL
              OR coalesce(p.currency_code,p.currency)=upper(btrim(filters->>'currencyCode')))
         AND (nullif(btrim(coalesce(filters->>'society','')),'') IS NULL
              OR p.society ILIKE '%' || btrim(filters->>'society') || '%')
         AND (nullif(btrim(coalesce(filters->>'propertyType','')),'') IS NULL
              OR filters->>'propertyType'='All Types'
              OR p.property_type=filters->>'propertyType')
         AND (nullif(btrim(coalesce(filters->>'listingType','')),'') IS NULL
              OR filters->>'listingType'='all'
              OR p.listing_type=filters->>'listingType')
         AND (beds IS NULL OR coalesce(p.beds,0)>=beds)
         AND (baths IS NULL OR coalesce(p.baths,0)>=baths)
         AND (
           (min_price IS NULL AND max_price IS NULL)
           OR (
             nullif(btrim(coalesce(filters->>'currencyCode','')),'') IS NOT NULL
             AND coalesce(p.currency_code,p.currency)=upper(btrim(filters->>'currencyCode'))
             AND (min_price IS NULL OR p.price>=min_price)
             AND (max_price IS NULL OR p.price<=max_price)
           )
         )
         AND (
           search_term IS NULL
           OR concat_ws(' ',p.title,p.city,p.country,p.society,p.location,p.description)
              ILIKE '%' || search_term || '%'
         )
       ORDER BY p.created_at DESC
       LIMIT 100
    LOOP
      INSERT INTO public.property_alerts(saved_search_id,user_id,property_id,read,sent_at)
      VALUES(saved.id,saved.user_id,property.id,false,now())
      ON CONFLICT(saved_search_id,property_id) DO NOTHING;
      GET DIAGNOSTICS inserted=ROW_COUNT;

      IF inserted>0 THEN
        match_count := match_count+1;
        IF notification_enabled THEN
          INSERT INTO public.notifications(
            user_id,type,title,body,link,resource_type,resource_id,created_at
          ) VALUES(
            saved.user_id,
            'saved_search_match',
            'New property matches your saved search',
            left(coalesce(property.title,'A new approved property') || ' — ' ||
                 coalesce(property.city,'') || ', ' || coalesce(property.country,''),240),
            '/property/' || property.id::text,
            'property',
            property.id,
            now()
          );
        END IF;
      END IF;
    END LOOP;

    IF p_frequency IN ('daily','weekly') THEN
      UPDATE public.saved_searches
         SET last_alerted_at=now()
       WHERE id=saved.id;
    END IF;
  END LOOP;

  RETURN match_count;
END;
$function$


DO $block$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname='propertyx-saved-search-alerts-daily';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
  SELECT jobid INTO jid FROM cron.job WHERE jobname='propertyx-saved-search-alerts-weekly';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
  PERFORM cron.schedule('propertyx-saved-search-alerts-daily','0 * * * *',
    'SELECT public.process_saved_search_alerts(''daily'');');
  PERFORM cron.schedule('propertyx-saved-search-alerts-weekly','0 * * * *',
    'SELECT public.process_saved_search_alerts(''weekly'');');
END;
$block$;