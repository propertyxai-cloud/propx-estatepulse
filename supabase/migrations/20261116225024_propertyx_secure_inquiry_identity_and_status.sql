-- Inquiries are attributable to the actual caller and a public, active listing.
-- The browser cannot choose the owner or user identity.

CREATE OR REPLACE FUNCTION public.set_inquiry_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE listing_owner uuid; actor uuid := auth.uid();
BEGIN
  IF NEW.property_id IS NULL THEN
    RAISE EXCEPTION 'A property is required for an inquiry' USING ERRCODE = '23502';
  END IF;
  SELECT coalesce(p.owner_id,p.posted_by) INTO listing_owner
    FROM public.properties p
   WHERE p.id=NEW.property_id AND p.moderation_status='approved'
     AND p.archived_at IS NULL
     AND coalesce(p.availability,'available') NOT IN ('sold','rented');
  IF NOT FOUND OR listing_owner IS NULL THEN
    RAISE EXCEPTION 'This property is not available for inquiries' USING ERRCODE = '22023';
  END IF;
  IF actor IS NOT NULL AND actor=listing_owner THEN
    RAISE EXCEPTION 'You cannot send an inquiry about your own listing' USING ERRCODE = '42501';
  END IF;
  NEW.user_id:=actor; NEW.inquirer_id:=actor; NEW.recipient_owner_id:=listing_owner;
  NEW.name:=btrim(coalesce(NEW.name,'')); NEW.phone:=btrim(coalesce(NEW.phone,''));
  NEW.email:=nullif(lower(btrim(coalesce(NEW.email,''))), '');
  NEW.message:=btrim(coalesce(NEW.message,''));
  IF char_length(NEW.name) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Name must be between 2 and 120 characters' USING ERRCODE='22023'; END IF;
  IF char_length(NEW.phone) NOT BETWEEN 6 AND 40 THEN RAISE EXCEPTION 'Phone must be between 6 and 40 characters' USING ERRCODE='22023'; END IF;
  IF NEW.email IS NOT NULL AND (char_length(NEW.email)>254 OR NEW.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN
    RAISE EXCEPTION 'Enter a valid email address' USING ERRCODE='22023';
  END IF;
  IF char_length(NEW.message) NOT BETWEEN 3 AND 5000 THEN RAISE EXCEPTION 'Message must be between 3 and 5000 characters' USING ERRCODE='22023'; END IF;
  NEW.status:='new'; NEW.source:='property_detail'; NEW.created_at:=now(); NEW.updated_at:=now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_inquiry_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.property_id IS DISTINCT FROM OLD.property_id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.inquirer_id IS DISTINCT FROM OLD.inquirer_id
    OR NEW.recipient_owner_id IS DISTINCT FROM OLD.recipient_owner_id
    OR NEW.name IS DISTINCT FROM OLD.name
    OR NEW.phone IS DISTINCT FROM OLD.phone
    OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.source IS DISTINCT FROM OLD.source
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Inquiry identity and contact fields are immutable' USING ERRCODE='42501';
  END IF;
  IF NEW.status NOT IN ('new','contacted','viewing','negotiating','converted','closed','lost') THEN
    RAISE EXCEPTION 'Invalid inquiry status %',NEW.status USING ERRCODE='22023';
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Anyone can submit an inquiry" ON public.inquiries;
CREATE POLICY "Validated visitors can submit property inquiries"
  ON public.inquiries FOR INSERT TO anon,authenticated
  WITH CHECK (
    user_id IS NOT DISTINCT FROM (select auth.uid())
    AND inquirer_id IS NOT DISTINCT FROM (select auth.uid())
    AND status='new'
    AND char_length(btrim(name)) BETWEEN 2 AND 120
    AND char_length(btrim(phone)) BETWEEN 6 AND 40
    AND char_length(btrim(message)) BETWEEN 3 AND 5000
    AND (email IS NULL OR (char_length(email)<=254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id=property_id AND p.moderation_status='approved'
        AND p.archived_at IS NULL AND coalesce(p.availability,'available') NOT IN ('sold','rented')
        AND coalesce(p.owner_id,p.posted_by) IS NOT NULL
        AND recipient_owner_id=coalesce(p.owner_id,p.posted_by)
        AND coalesce(p.owner_id,p.posted_by) IS DISTINCT FROM (select auth.uid())
    )
  );
CREATE INDEX IF NOT EXISTS inquiries_recipient_owner_created_idx ON public.inquiries(recipient_owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_inquirer_created_idx ON public.inquiries(inquirer_id,created_at DESC);
