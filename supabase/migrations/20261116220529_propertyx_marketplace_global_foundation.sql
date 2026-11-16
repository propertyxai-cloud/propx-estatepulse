-- Global profile settings, safe public agent profiles, moderated reviews,
-- database-derived directories, and genuine monthly listing-price snapshots.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_country_code char(2),
  ADD COLUMN IF NOT EXISTS preferred_city text,
  ADD COLUMN IF NOT EXISTS preferred_currency_code char(3),
  ADD COLUMN IF NOT EXISTS preferred_timezone text,
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_country_code_iso2_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_country_code_iso2_chk
      CHECK (preferred_country_code IS NULL OR preferred_country_code ~ '^[A-Z]{2}$') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_currency_code_iso3_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_currency_code_iso3_chk
      CHECK (preferred_currency_code IS NULL OR preferred_currency_code ~ '^[A-Z]{3}$') NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_timezone_nonempty_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_timezone_nonempty_chk
      CHECK (preferred_timezone IS NULL OR length(btrim(preferred_timezone)) BETWEEN 1 AND 100) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_language_code_chk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_language_code_chk
      CHECK (preferred_language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$') NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.agent_public_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  public_name text NOT NULL CHECK (char_length(btrim(public_name)) BETWEEN 2 AND 120),
  headline text CHECK (headline IS NULL OR char_length(headline) <= 160),
  bio text CHECK (bio IS NULL OR char_length(bio) <= 3000),
  company_name text CHECK (company_name IS NULL OR char_length(company_name) <= 160),
  avatar_url text CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 2000),
  city text,
  country_code char(2) CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  public_phone text CHECK (public_phone IS NULL OR char_length(public_phone) <= 40),
  website_url text CHECK (website_url IS NULL OR char_length(website_url) <= 500),
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_public_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published agent profiles" ON public.agent_public_profiles;
CREATE POLICY "Public can read published agent profiles"
  ON public.agent_public_profiles FOR SELECT TO anon, authenticated
  USING (is_published = true OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Agents manage their own public profile" ON public.agent_public_profiles;
CREATE POLICY "Agents manage their own public profile"
  ON public.agent_public_profiles FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role IN ('agent','seller')
        AND p.suspended_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Agents update their own public profile" ON public.agent_public_profiles;
CREATE POLICY "Agents update their own public profile"
  ON public.agent_public_profiles FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.role IN ('agent','seller')
        AND p.suspended_at IS NULL
    )
  );

CREATE TABLE IF NOT EXISTS public.broker_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES public.agent_public_profiles(user_id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  communication smallint CHECK (communication IS NULL OR communication BETWEEN 1 AND 5),
  professionalism smallint CHECK (professionalism IS NULL OR professionalism BETWEEN 1 AND 5),
  market_knowledge smallint CHECK (market_knowledge IS NULL OR market_knowledge BETWEEN 1 AND 5),
  review text NOT NULL CHECK (char_length(btrim(review)) BETWEEN 20 AND 2000),
  verified_deal boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broker_reviews_one_per_reviewer UNIQUE (broker_id, reviewer_id),
  CONSTRAINT broker_reviews_no_self_review CHECK (broker_id <> reviewer_id)
);
ALTER TABLE public.broker_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read approved broker reviews" ON public.broker_reviews;
CREATE POLICY "Public can read approved broker reviews"
  ON public.broker_reviews FOR SELECT TO anon, authenticated
  USING (moderation_status = 'approved' OR reviewer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Signed-in users can submit unverified broker reviews" ON public.broker_reviews;
CREATE POLICY "Signed-in users can submit unverified broker reviews"
  ON public.broker_reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = (select auth.uid())
    AND broker_id <> (select auth.uid())
    AND verified_deal = false
    AND moderation_status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.agent_public_profiles ap
      WHERE ap.user_id = broker_id AND ap.is_published = true
    )
  );

CREATE OR REPLACE VIEW public.society_directory
WITH (security_invoker = true) AS
SELECT
  min(p.id::text)::uuid AS id,
  p.society AS name,
  p.city,
  coalesce(p.country, 'Unknown') AS country,
  p.country_code,
  coalesce(p.currency_code, p.currency, 'USD') AS currency_code,
  count(*)::integer AS listings_count,
  round(avg(p.price), 2) AS average_listing_price,
  max(p.created_at) AS latest_listing_at
FROM public.properties p
WHERE p.moderation_status = 'approved'
  AND p.archived_at IS NULL
  AND nullif(btrim(p.society), '') IS NOT NULL
GROUP BY p.society, p.city, coalesce(p.country, 'Unknown'),
         p.country_code, coalesce(p.currency_code, p.currency, 'USD');

CREATE OR REPLACE VIEW public.broker_directory
WITH (security_invoker = true) AS
SELECT
  ap.user_id AS id,
  ap.public_name AS name,
  ap.headline,
  ap.bio,
  ap.company_name,
  ap.avatar_url,
  ap.city,
  ap.country_code,
  ap.public_phone,
  ap.website_url,
  count(br.id) FILTER (WHERE br.moderation_status = 'approved')::integer AS review_count,
  round(avg(br.rating) FILTER (WHERE br.moderation_status = 'approved'), 2) AS rating,
  round(avg(br.communication) FILTER (WHERE br.moderation_status = 'approved'), 2) AS communication,
  round(avg(br.professionalism) FILTER (WHERE br.moderation_status = 'approved'), 2) AS professionalism,
  round(avg(br.market_knowledge) FILTER (WHERE br.moderation_status = 'approved'), 2) AS market_knowledge,
  count(br.id) FILTER (WHERE br.moderation_status = 'approved' AND br.verified_deal)::integer AS verified_deals,
  ap.created_at
FROM public.agent_public_profiles ap
LEFT JOIN public.broker_reviews br ON br.broker_id = ap.user_id
WHERE ap.is_published = true
GROUP BY ap.user_id, ap.public_name, ap.headline, ap.bio, ap.company_name,
         ap.avatar_url, ap.city, ap.country_code, ap.public_phone,
         ap.website_url, ap.created_at;

GRANT SELECT ON public.society_directory TO anon, authenticated;
GRANT SELECT ON public.broker_directory TO anon, authenticated;
GRANT SELECT ON public.agent_public_profiles TO anon, authenticated;
GRANT SELECT ON public.broker_reviews TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.market_price_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_month date NOT NULL,
  country_code char(2) NOT NULL,
  city text NOT NULL,
  currency_code char(3) NOT NULL,
  property_type text NOT NULL,
  listing_count integer NOT NULL CHECK (listing_count >= 0),
  median_price numeric(16,2),
  average_price numeric(16,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_month, country_code, city, currency_code, property_type)
);
ALTER TABLE public.market_price_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read market snapshots" ON public.market_price_snapshots;
CREATE POLICY "Public can read market snapshots"
  ON public.market_price_snapshots FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.market_price_snapshots TO anon, authenticated;
CREATE INDEX IF NOT EXISTS market_price_snapshots_lookup_idx
  ON public.market_price_snapshots(country_code, city, currency_code, snapshot_month DESC);

CREATE OR REPLACE FUNCTION public.capture_market_price_snapshots()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE captured integer;
BEGIN
  INSERT INTO public.market_price_snapshots (
    snapshot_month, country_code, city, currency_code, property_type,
    listing_count, median_price, average_price
  )
  SELECT
    date_trunc('month', now())::date,
    coalesce(p.country_code, 'ZZ'),
    p.city,
    coalesce(p.currency_code, p.currency, 'USD'),
    p.property_type,
    count(*)::integer,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY p.price),
    round(avg(p.price), 2)
  FROM public.properties p
  WHERE p.moderation_status = 'approved'
    AND p.archived_at IS NULL
    AND p.price > 0
  GROUP BY coalesce(p.country_code, 'ZZ'), p.city,
           coalesce(p.currency_code, p.currency, 'USD'), p.property_type
  ON CONFLICT (snapshot_month, country_code, city, currency_code, property_type)
  DO UPDATE SET
    listing_count = EXCLUDED.listing_count,
    median_price = EXCLUDED.median_price,
    average_price = EXCLUDED.average_price,
    created_at = now();
  GET DIAGNOSTICS captured = ROW_COUNT;
  RETURN captured;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_market_price_snapshots() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_market_price_snapshots() TO service_role;

DO $$
DECLARE existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job WHERE jobname = 'propertyx-market-price-snapshots';
  IF existing_job IS NOT NULL THEN PERFORM cron.unschedule(existing_job); END IF;
  PERFORM cron.schedule('propertyx-market-price-snapshots', '0 2 1 * *',
    'SELECT public.capture_market_price_snapshots();');
END $$;
