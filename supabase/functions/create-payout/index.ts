import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYOUT] ${step}${detailsStr}`);
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
    logStep("Function started");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);

    const { payout_id } = await req.json();
    logStep("Request data", { payout_id });

    // Get payout details
    const { data: payout, error: payoutError } = await supabaseClient
      .from("payouts")
      .select("*, driver:drivers(*), fleet:fleets(*)")
      .eq("id", payout_id)
      .maybeSingle();

    if (payoutError || !payout) {
      throw new Error("Payout not found");
    }

    if (payout.status === "paid") {
      throw new Error("Payout already processed");
    }

    logStep("Payout found", { amount: payout.amount, driver_id: payout.driver_id, fleet_id: payout.fleet_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Determine destination account
    let stripeAccountId: string | null = null;
    let recipientName = "";

    if (payout.driver_id && payout.driver) {
      stripeAccountId = payout.driver.stripe_account_id;
      recipientName = "Motorista";
    } else if (payout.fleet_id && payout.fleet) {
      stripeAccountId = payout.fleet.stripe_account_id;
      recipientName = payout.fleet.company_name;
    }

    if (!stripeAccountId) {
      throw new Error("Beneficiário não possui conta Stripe Connect configurada");
    }

    logStep("Destination account", { stripeAccountId, recipientName });

    // Create transfer to connected account
    const transfer = await stripe.transfers.create({
      amount: Math.round(payout.amount * 100), // Convert to cents
      currency: "brl",
      destination: stripeAccountId,
      metadata: {
        payout_id: payout_id,
        trip_id: payout.trip_id,
      },
    });

    logStep("Transfer created", { transferId: transfer.id });

    // Update payout status
    const { error: updateError } = await supabaseClient
      .from("payouts")
      .update({
        status: "paid",
        payment_date: new Date().toISOString(),
        method: "stripe_connect",
        receipt_url: `https://dashboard.stripe.com/transfers/${transfer.id}`,
      })
      .eq("id", payout_id);

    if (updateError) {
      logStep("Warning: Failed to update payout status", { error: updateError.message });
    }

    logStep("Payout completed successfully");

    return new Response(JSON.stringify({ 
      success: true,
      transfer_id: transfer.id,
      amount: payout.amount,
      recipient: recipientName,
    }), {
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
