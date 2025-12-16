
-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Admin/Staff can manage suppliers
CREATE POLICY "Admin/Staff can manage suppliers"
ON public.suppliers
FOR ALL
USING (is_admin_or_staff(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate supplier code
CREATE OR REPLACE FUNCTION public.generate_supplier_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.suppliers;
  
  NEW.code := 'SUP' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate code
CREATE TRIGGER generate_supplier_code_trigger
BEFORE INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.generate_supplier_code();

-- Add supplier and flight fields to trips table
ALTER TABLE public.trips
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id),
ADD COLUMN flight_code TEXT,
ADD COLUMN arrival_time TIME;
