-- Remove the incorrect client-state check which prevented admin review approval.
ALTER TABLE public.broker_reviews
  DROP CONSTRAINT IF EXISTS broker_reviews_client_unverified;
