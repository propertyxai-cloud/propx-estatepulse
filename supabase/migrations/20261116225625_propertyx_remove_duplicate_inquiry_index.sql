-- Keep the original inquiry recipient index; remove the duplicate created
-- by the newer lead-attribution migration.
DROP INDEX IF EXISTS public.inquiries_recipient_owner_created_idx;
