
CREATE OR REPLACE FUNCTION public.guard_user_notification_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_propertyx_admin() THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You may only update your own notifications'
      USING ERRCODE='42501';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.type IS DISTINCT FROM OLD.type
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.body IS DISTINCT FROM OLD.body
    OR NEW.link IS DISTINCT FROM OLD.link
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Notification content and ownership are immutable'
      USING ERRCODE='42501';
  END IF;
  -- Read state is monotonic: a client may mark a notification read, not unread.
  IF OLD.read_at IS NOT NULL THEN
    NEW.read_at := OLD.read_at;
  ELSIF NEW.read_at IS NULL THEN
    NEW.read_at := NULL;
  ELSE
    NEW.read_at := coalesce(NEW.read_at,now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_user_property_alert_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_propertyx_admin() THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You may only update your own property alerts'
      USING ERRCODE='42501';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.saved_search_id IS DISTINCT FROM OLD.saved_search_id
    OR NEW.property_id IS DISTINCT FROM OLD.property_id
    OR NEW.sent_at IS DISTINCT FROM OLD.sent_at THEN
    RAISE EXCEPTION 'Property alert identity and matching property are immutable'
      USING ERRCODE='42501';
  END IF;
  -- Alert read state is monotonic.
  NEW.read := coalesce(OLD.read,false) OR coalesce(NEW.read,false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_notification_update ON public.notifications;
CREATE TRIGGER trg_guard_user_notification_update
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_notification_update();

DROP TRIGGER IF EXISTS trg_guard_user_property_alert_update ON public.property_alerts;
CREATE TRIGGER trg_guard_user_property_alert_update
  BEFORE UPDATE ON public.property_alerts
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_property_alert_update();

REVOKE ALL ON FUNCTION public.guard_user_notification_update() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_user_property_alert_update() FROM PUBLIC,anon,authenticated;
