-- Treat either owner_id or posted_by as the listing owner for legacy rows.
DROP POLICY IF EXISTS "Public can view approved properties" ON public.properties;
CREATE POLICY "Public can view approved properties" ON public.properties FOR SELECT TO public
  USING (
    (moderation_status='approved' AND archived_at IS NULL)
    OR owner_id=(select auth.uid())
    OR posted_by=(select auth.uid())
    OR public.is_propertyx_admin()
  );

DROP POLICY IF EXISTS "Inquiry participants can read inquiries" ON public.inquiries;
CREATE POLICY "Inquiry participants can read inquiries" ON public.inquiries FOR SELECT TO public
  USING (
    inquirer_id=(select auth.uid())
    OR user_id=(select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id=inquiries.property_id
        AND coalesce(p.owner_id,p.posted_by)=(select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Property owners can update inquiries" ON public.inquiries;
CREATE POLICY "Property owners can update inquiries" ON public.inquiries FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id=inquiries.property_id
        AND coalesce(p.owner_id,p.posted_by)=(select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id=inquiries.property_id
        AND coalesce(p.owner_id,p.posted_by)=(select auth.uid())
    )
  );
