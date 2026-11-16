-- Safe account erasure with explicit financial retention blockers.
-- Workspace owners can transfer ownership only to an existing active member.
-- Retained records are anonymised where required; payment/investment ledgers
-- are not silently erased and must be reviewed before deletion.

CREATE OR REPLACE FUNCTION public.guard_organization_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.is_propertyx_admin() THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication is required to create an organization' USING ERRCODE='42501';
    END IF;
    NEW.created_by:=auth.uid(); NEW.plan:='starter'; NEW.created_at:=now(); NEW.updated_at:=now();
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.plan IS DISTINCT FROM OLD.plan OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only a PropertyX administrator can change organization identity or plan' USING ERRCODE='42501';
  END IF;
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    IF OLD.created_by=auth.uid() AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id=OLD.id AND m.user_id=NEW.created_by
    ) THEN
      NEW.updated_at:=now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Organization ownership may only be transferred to an existing member' USING ERRCODE='42501';
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, legacy
AS $$
DECLARE
  uid uuid := auth.uid();
  org record;
  successor uuid;
  current_org record;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.payment_orders WHERE owner_id=uid) THEN
    RAISE EXCEPTION 'Your account has payment history that must be retained. Contact PropertyX support to complete the account-deletion review.'
      USING ERRCODE='23503';
  END IF;

  IF EXISTS (SELECT 1 FROM public.investments WHERE investor_id=uid) THEN
    RAISE EXCEPTION 'Your account has investment records that require administrator review before deletion.'
      USING ERRCODE='23503';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.investments i
    JOIN public.properties p ON p.id=i.property_id
    WHERE p.owner_id=uid OR p.posted_by=uid
  ) THEN
    RAISE EXCEPTION 'One or more of your properties have investment records. Contact PropertyX support before deleting this account.'
      USING ERRCODE='23503';
  END IF;

  FOR org IN SELECT id FROM public.organizations WHERE created_by=uid FOR UPDATE LOOP
    SELECT m.user_id INTO successor
    FROM public.organization_members m
    JOIN public.profiles pr ON pr.id=m.user_id
    WHERE m.organization_id=org.id AND m.user_id<>uid AND pr.suspended_at IS NULL
    ORDER BY CASE m.role WHEN 'admin' THEN 0 WHEN 'owner' THEN 1 ELSE 2 END,m.created_at
    LIMIT 1;

    IF successor IS NOT NULL THEN
      UPDATE public.organizations SET created_by=successor WHERE id=org.id;
      UPDATE public.organization_members SET role='owner'
       WHERE organization_id=org.id AND user_id=successor;
    ELSIF EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id=org.id AND user_id<>uid
    ) THEN
      RAISE EXCEPTION 'An organization owned by this account has members but no eligible active successor. Ask an administrator to transfer it before deletion.'
        USING ERRCODE='23503';
    ELSE
      DELETE FROM public.organizations WHERE id=org.id;
    END IF;
  END LOOP;

  FOR current_org IN
    SELECT m.organization_id,o.created_by
    FROM public.organization_members m
    JOIN public.organizations o ON o.id=m.organization_id
    WHERE m.user_id=uid AND m.role='owner' AND o.created_by<>uid
  LOOP
    INSERT INTO public.organization_members(organization_id,user_id,role,invited_by)
    VALUES(current_org.organization_id,current_org.created_by,'owner',uid)
    ON CONFLICT(organization_id,user_id) DO UPDATE SET role='owner';
  END LOOP;

  DELETE FROM public.contact_messages WHERE user_id=uid;
  DELETE FROM public.inquiries
   WHERE user_id=uid OR inquirer_id=uid OR recipient_owner_id=uid;

  UPDATE public.bookings
     SET user_id=NULL,name='Deleted user',phone='redacted'
   WHERE user_id=uid;

  UPDATE public.email_deliveries
     SET user_id=NULL,recipient='redacted',payload='{}'::jsonb,last_error=NULL
   WHERE user_id=uid;

  UPDATE legacy.deal_requests
     SET buyer_id=NULL,buyer_name='Deleted user',buyer_phone='',
         payment_details=NULL,notes=''
   WHERE buyer_id=uid;

  UPDATE public.audit_logs SET actor_id=NULL WHERE actor_id=uid;
  UPDATE public.platform_audit_events SET actor_id=NULL WHERE actor_id=uid;

  DELETE FROM public.properties WHERE owner_id=uid OR posted_by=uid;
  DELETE FROM public.favorites WHERE user_id=uid;
  DELETE FROM public.saved_searches WHERE user_id=uid;
  DELETE FROM public.recently_viewed WHERE user_id=uid;
  DELETE FROM public.notifications WHERE user_id=uid;
  DELETE FROM public.notification_preferences WHERE user_id=uid;
  DELETE FROM public.listing_reports WHERE reporter_id=uid;
  DELETE FROM public.broker_reviews WHERE reviewer_id=uid;
  DELETE FROM public.profiles WHERE id=uid;
  DELETE FROM auth.users WHERE id=uid;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'This account has linked financial or compliance records that require administrator review before deletion.'
      USING ERRCODE='23503';
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
