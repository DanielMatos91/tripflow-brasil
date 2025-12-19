-- Drop and recreate the complete_trip function to also create payout records
CREATE OR REPLACE FUNCTION public.complete_trip(_trip_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _driver_id uuid;
  _trip_record record;
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

  -- Get trip details before updating
  SELECT t.id, t.payout_driver, t.supplier_id, t.driver_id, t.fleet_id
  INTO _trip_record
  FROM public.trips t
  WHERE t.id = _trip_id
    AND t.driver_id = _driver_id
    AND t.status = 'IN_PROGRESS';

  IF _trip_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Esta corrida não pode ser concluída.'
    );
  END IF;

  -- Update trip status
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

  -- Create payout record for the driver
  INSERT INTO public.payouts (
    trip_id,
    driver_id,
    fleet_id,
    amount,
    status
  ) VALUES (
    _trip_id,
    _driver_id,
    _trip_record.fleet_id,
    _trip_record.payout_driver,
    'pending'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Corrida concluída com sucesso!',
    'payout_amount', _trip_record.payout_driver
  );
END;
$$;