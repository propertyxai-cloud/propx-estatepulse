-- Administrator access to pending moderation and the support inbox.
DROP POLICY IF EXISTS "Public can read approved broker reviews" ON public.broker_reviews;
CREATE POLICY "Public owners and admins can read broker reviews"
  ON public.broker_reviews FOR SELECT TO anon, authenticated
  USING (
    moderation_status='approved'
    OR reviewer_id=(select auth.uid())
    OR public.is_propertyx_admin()
  );

DROP POLICY IF EXISTS "sender reads own message" ON public.contact_messages;
CREATE POLICY "Senders and admins can read contact messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (user_id=(select auth.uid()) OR public.is_propertyx_admin());

DROP POLICY IF EXISTS "Admins update contact message status" ON public.contact_messages;
CREATE POLICY "Admins update contact message status"
  ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.is_propertyx_admin())
  WITH CHECK (public.is_propertyx_admin());

CREATE INDEX IF NOT EXISTS contact_messages_status_created_idx
  ON public.contact_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS listing_reports_status_created_idx
  ON public.listing_reports(status, created_at DESC);
