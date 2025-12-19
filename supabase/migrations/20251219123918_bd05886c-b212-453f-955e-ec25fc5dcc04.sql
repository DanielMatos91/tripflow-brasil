-- Add stripe_invoice_id to payouts table to track the invoice
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS stripe_invoice_id text;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_payouts_stripe_invoice_id ON public.payouts(stripe_invoice_id);