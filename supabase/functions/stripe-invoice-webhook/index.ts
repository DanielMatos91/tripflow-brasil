import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-INVOICE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Webhook received");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logStep("Webhook signature verification failed", { error: errorMsg });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For development/testing without signature verification
      event = JSON.parse(body);
      logStep("Webhook received without signature verification (dev mode)");
    }

    logStep("Event type", { type: event.type });

    // Handle invoice.paid event
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Invoice paid", { 
        invoiceId: invoice.id, 
        amount: invoice.amount_paid,
        tripId: invoice.metadata?.trip_id 
      });

      const tripId = invoice.metadata?.trip_id;

      if (tripId) {
        // Find the payout for this trip and mark it as paid
        const { data: payout, error: payoutFetchError } = await supabaseClient
          .from("payouts")
          .select("*")
          .eq("trip_id", tripId)
          .eq("status", "pending")
          .maybeSingle();

        if (payoutFetchError) {
          logStep("Error fetching payout", { error: payoutFetchError.message });
        } else if (payout) {
          // Update payout status to paid
          const { error: updateError } = await supabaseClient
            .from("payouts")
            .update({
              status: "paid",
              payment_date: new Date().toISOString(),
              method: "stripe_invoice",
              stripe_invoice_id: invoice.id,
            })
            .eq("id", payout.id);

          if (updateError) {
            logStep("Error updating payout", { error: updateError.message });
          } else {
            logStep("Payout marked as paid", { payoutId: payout.id, amount: payout.amount });
          }

          // Also update the payment record if exists
          await supabaseClient
            .from("payments")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("trip_id", tripId)
            .eq("gateway_payment_id", invoice.id);

          logStep("Payment record updated");
        } else {
          logStep("No pending payout found for trip", { tripId });
        }
      } else {
        logStep("No trip_id in invoice metadata");
      }
    }

    // Handle invoice.payment_failed event
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Invoice payment failed", { 
        invoiceId: invoice.id,
        tripId: invoice.metadata?.trip_id 
      });

      const tripId = invoice.metadata?.trip_id;
      if (tripId) {
        // Update payment record to failed
        await supabaseClient
          .from("payments")
          .update({ status: "failed" })
          .eq("trip_id", tripId)
          .eq("gateway_payment_id", invoice.id);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});