-- Exclude unavailable inventory from public directories and market snapshots.
CREATE OR REPLACE VIEW public.society_directory
WITH (security_invoker = true) AS
SELECT min(p.id::text)::uuid AS id,p.society AS name,p.city,
       coalesce(p.country,'Unknown') AS country,p.country_code,
       coalesce(p.currency_code,p.currency,'USD') AS currency_code,
       count(*)::integer AS listings_count,round(avg(p.price),2) AS average_listing_price,
       max(p.created_at) AS latest_listing_at
FROM public.properties p
WHERE p.moderation_status='approved' AND p.archived_at IS NULL
  AND coalesce(p.availability,'available') IN ('available','under_offer')
  AND nullif(btrim(p.society),'') IS NOT NULL
GROUP BY p.society,p.city,coalesce(p.country,'Unknown'),p.country_code,
         coalesce(p.currency_code,p.currency,'USD');

CREATE OR REPLACE FUNCTION public.capture_market_price_snapshots()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE captured integer;
BEGIN
  INSERT INTO public.market_price_snapshots(snapshot_month,country_code,city,currency_code,property_type,listing_count,median_price,average_price)
  SELECT date_trunc('month',now())::date,coalesce(p.country_code,'ZZ'),p.city,
         coalesce(p.currency_code,p.currency,'USD'),p.property_type,count(*)::integer,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY p.price),round(avg(p.price),2)
  FROM public.properties p
  WHERE p.moderation_status='approved' AND p.archived_at IS NULL
    AND coalesce(p.availability,'available') IN ('available','under_offer')
    AND p.price>0
  GROUP BY coalesce(p.country_code,'ZZ'),p.city,coalesce(p.currency_code,p.currency,'USD'),p.property_type
  ON CONFLICT(snapshot_month,country_code,city,currency_code,property_type)
  DO UPDATE SET listing_count=EXCLUDED.listing_count,median_price=EXCLUDED.median_price,
                average_price=EXCLUDED.average_price,created_at=now();
  GET DIAGNOSTICS captured=ROW_COUNT;
  RETURN captured;
END $$;
REVOKE ALL ON FUNCTION public.capture_market_price_snapshots() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.capture_market_price_snapshots() TO service_role;
