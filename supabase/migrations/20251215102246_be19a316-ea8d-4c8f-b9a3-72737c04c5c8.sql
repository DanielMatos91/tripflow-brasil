-- Allow drivers to insert their own profile (only one per user)
CREATE POLICY "Drivers can insert their own profile"
ON public.drivers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow drivers to update their own profile
CREATE POLICY "Drivers can update their own profile"
ON public.drivers
FOR UPDATE
USING (auth.uid() = user_id);