-- Function to start a trip (driver only)
CREATE OR REPLACE FUNCTION public.start_trip(_trip_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver_id uuid;
  _rows_updated integer;
BEGIN
  -- Get driver_id for current user
  SELECT id INTO _driver_id
  FROM public.drivers
  WHERE user_id = auth.uid()
    AND verified = true
    AND status = 'active';

  IF _driver_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Você precisa ser um motorista verificado e ativo.'
    );
  END IF;

  -- Update trip if it belongs to this driver and is CLAIMED
  UPDATE public.trips
  SET 
    status = 'IN_PROGRESS',
    started_at = now(),
    updated_at = now()
  WHERE id = _trip_id
    AND driver_id = _driver_id
    AND status = 'CLAIMED';

  GET DIAGNOSTICS _rows_updated = ROW_COUNT;

  IF _rows_updated = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Esta corrida não pode ser iniciada.'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Corrida iniciada com sucesso!'
  );
END;
$$;

-- Function to complete a trip (driver only)
CREATE OR REPLACE FUNCTION public.complete_trip(_trip_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver_id uuid;
  _rows_updated integer;
BEGIN
  -- Get driver_id for current user
  SELECT id INTO _driver_id
  FROM public.drivers
  WHERE user_id = auth.uid()
    AND verified = true
    AND status = 'active';

  IF _driver_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Você precisa ser um motorista verificado e ativo.'
    );
  END IF;

  -- Update trip if it belongs to this driver and is IN_PROGRESS
  UPDATE public.trips
  SET 
    status = 'COMPLETED',
    completed_at = now(),
    updated_at = now()
  WHERE id = _trip_id
    AND driver_id = _driver_id
    AND status = 'IN_PROGRESS';

  GET DIAGNOSTICS _rows_updated = ROW_COUNT;

  IF _rows_updated = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Esta corrida não pode ser concluída.'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Corrida concluída com sucesso!'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.start_trip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_trip(uuid) TO authenticated;