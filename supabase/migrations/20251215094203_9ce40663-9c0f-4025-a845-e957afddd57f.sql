-- Add foreign key from drivers.user_id to profiles.id
ALTER TABLE public.drivers
ADD CONSTRAINT drivers_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;