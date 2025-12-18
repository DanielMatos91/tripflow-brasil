-- Add Stripe account ID columns for Connect integration
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

ALTER TABLE public.fleets 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Add Stripe customer ID to suppliers for invoicing
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;