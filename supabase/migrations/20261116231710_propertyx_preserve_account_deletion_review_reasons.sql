CREATE OR REPLACE FUNCTION public.delete_my_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'legacy'
AS $function$
DECLARE
  uid uuid := auth.uid();
  org record;
  successor uuid;
  current_org record;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Financial and investment ledgers cannot be erased by self-service deletion.
  -- Resolve these through the platform's compliance/support process first.
  IF EXISTS (SELECT 1 FROM public.payment_orders WHERE owner_id = uid) THEN
    RAISE EXCEPTION 'Your account has payment history that must be retained. Contact PropertyX support to complete the account-deletion review.'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM public.investments WHERE investor_id = uid) THEN
    RAISE EXCEPTION 'Your account has investment records that require administrator review before deletion.'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.investments i
      JOIN public.properties p ON p.id = i.property_id
     WHERE p.owner_id = uid OR p.posted_by = uid
  ) THEN
    RAISE EXCEPTION 'One or more of your properties have investment records. Contact PropertyX support before deleting this account.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Transfer workspaces created by the user to an active existing member.
  FOR org IN
    SELECT id
      FROM public.organizations
     WHERE created_by = uid
     FOR UPDATE
  LOOP
    SELECT m.user_id
      INTO successor
      FROM public.organization_members m
      JOIN public.profiles pr ON pr.id = m.user_id
     WHERE m.organization_id = org.id
       AND m.user_id <> uid
       AND pr.suspended_at IS NULL
     ORDER BY CASE m.role WHEN 'admin' THEN 0 WHEN 'owner' THEN 1 ELSE 2 END,
              m.created_at
     LIMIT 1;

    IF successor IS NOT NULL THEN
      UPDATE public.organizations
         SET created_by = successor
       WHERE id = org.id;
      UPDATE public.organization_members
         SET role = 'owner'
       WHERE organization_id = org.id
         AND user_id = successor;
    ELSIF EXISTS (
      SELECT 1 FROM public.organization_members
       WHERE organization_id = org.id AND user_id <> uid
    ) THEN
      RAISE EXCEPTION 'An organization owned by this account has members but no eligible active successor. Ask an administrator to transfer it before deletion.'
        USING ERRCODE = 'P0001';
    ELSE
      DELETE FROM public.organizations WHERE id = org.id;
    END IF;
  END LOOP;

  -- If the user is the only recorded workspace owner but not creator, restore
  -- the creator as an owner/member before removing the departing user.
  FOR current_org IN
    SELECT m.organization_id, o.created_by
      FROM public.organization_members m
      JOIN public.organizations o ON o.id = m.organization_id
     WHERE m.user_id = uid
       AND m.role = 'owner'
       AND o.created_by <> uid
  LOOP
    INSERT INTO public.organization_members (
      organization_id, user_id, role, invited_by
    )
    VALUES (current_org.organization_id, current_org.created_by, 'owner', uid)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET role = 'owner';
  END LOOP;

  -- Remove user-owned support messages and inquiries (both contain direct PII).
  DELETE FROM public.contact_messages WHERE user_id = uid;
  DELETE FROM public.inquiries
   WHERE user_id = uid OR inquirer_id = uid OR recipient_owner_id = uid;

  -- Anonymise retained bookings and email-delivery records before auth deletion.
  UPDATE public.bookings
     SET user_id = NULL, name = 'Deleted user', phone = 'redacted'
   WHERE user_id = uid;

  UPDATE public.email_deliveries
     SET user_id = NULL,
         recipient = 'redacted',
         payload = '{}'::jsonb,
         last_error = NULL
   WHERE user_id = uid;

  -- Preserve legacy transaction history but remove direct buyer identity/contact.
  UPDATE legacy.deal_requests
     SET buyer_id = NULL,
         buyer_name = 'Deleted user',
         buyer_phone = '',
         payment_details = NULL,
         notes = ''
   WHERE buyer_id = uid;

  -- Retain audit history without a link to the deleted identity.
  UPDATE public.audit_logs SET actor_id = NULL WHERE actor_id = uid;
  UPDATE public.platform_audit_events SET actor_id = NULL WHERE actor_id = uid;

  -- Remove remaining account-scoped marketplace data.
  DELETE FROM public.properties WHERE owner_id = uid OR posted_by = uid;
  DELETE FROM public.favorites WHERE user_id = uid;
  DELETE FROM public.saved_searches WHERE user_id = uid;
  DELETE FROM public.recently_viewed WHERE user_id = uid;
  DELETE FROM public.notifications WHERE user_id = uid;
  DELETE FROM public.notification_preferences WHERE user_id = uid;
  DELETE FROM public.listing_reports WHERE reporter_id = uid;
  DELETE FROM public.broker_reviews WHERE reviewer_id = uid;
  DELETE FROM public.profiles WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'This account has linked financial or compliance records that require administrator review before deletion.'
      USING ERRCODE = '23503';
END;
$function$
