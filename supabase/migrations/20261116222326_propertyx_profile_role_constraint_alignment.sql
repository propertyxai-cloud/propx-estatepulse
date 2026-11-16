-- Keep one consistent role allow-list; staff remains reserved for trusted admins.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_valid
  CHECK (role IS NULL OR role = ANY (ARRAY['buyer','seller','investor','agent','staff','admin']));
