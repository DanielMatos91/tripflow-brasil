-- 1) Ensure new signups get default DRIVER role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- create profile
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        updated_at = now();

  -- default role: DRIVER
  INSERT INTO public.user_roles (user_id, role, status)
  VALUES (NEW.id, 'DRIVER'::app_role, 'active'::user_status)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2) Optional but helpful: uniqueness so we can safely use ON CONFLICT for roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;