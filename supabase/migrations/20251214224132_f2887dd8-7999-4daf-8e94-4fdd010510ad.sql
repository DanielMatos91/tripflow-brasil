-- Function to allow verified drivers to claim published trips
CREATE OR REPLACE FUNCTION public.claim_trip(_trip_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver_id uuid;
  _rows_updated integer;
BEGIN
  -- 1. Check if current user is a verified and active driver
  SELECT id INTO _driver_id
  FROM public.drivers
  WHERE user_id = auth.uid()
    AND verified = true
    AND status = 'active';

  IF _driver_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Você precisa ser um motorista verificado e ativo para aceitar corridas.'
    );
  END IF;

  -- 2. Try to claim the trip (only if PUBLISHED and no driver assigned)
  UPDATE public.trips
  SET 
    driver_id = _driver_id,
    claimed_at = now(),
    status = 'CLAIMED',
    updated_at = now()
  WHERE id = _trip_id
    AND status = 'PUBLISHED'
    AND driver_id IS NULL;

  GET DIAGNOSTICS _rows_updated = ROW_COUNT;

  -- 3. Check if we actually updated something
  IF _rows_updated = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Esta corrida já foi aceita por outro motorista ou não está mais disponível.'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Corrida aceita com sucesso!',
    'trip_id', _trip_id,
    'driver_id', _driver_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_trip(uuid) TO authenticated;