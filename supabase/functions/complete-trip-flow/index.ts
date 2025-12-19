import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLETE-TRIP-FLOW] ${step}${detailsStr}`);
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
    const user = userData.user;

    const { trip_id } = await req.json();
    if (!trip_id) throw new Error("trip_id is required");

    logStep("Request data", { trip_id, userId: user?.id });

    // Step 1: Complete the trip using the database function
    const { data: completeResult, error: completeError } = await supabaseClient.rpc(
      "complete_trip",
      { _trip_id: trip_id }
    );

    if (completeError) {
      throw new Error(`Failed to complete trip: ${completeError.message}`);
    }

    const result = completeResult as { success: boolean; error?: string; payout_amount?: number };
    if (!result.success) {
      throw new Error(result.error || "Failed to complete trip");
    }

    logStep("Trip completed", { payoutAmount: result.payout_amount });

    // Step 2: Fetch trip details to get supplier and pricing info
    const { data: trip, error: tripError } = await supabaseClient
      .from("trips")
      .select("*, supplier:suppliers(*)")
      .eq("id", trip_id)
      .maybeSingle();

    if (tripError || !trip) {
      logStep("Warning: Could not fetch trip details", { error: tripError?.message });
      return new Response(JSON.stringify({ 
        success: true,
        message: "Corrida concluída! (Invoice não criada - fornecedor não encontrado)",
        payout_amount: result.payout_amount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Step 3: Check if trip has a supplier - if not, skip invoice creation
    if (!trip.supplier_id || !trip.supplier) {
      logStep("No supplier associated with trip, skipping invoice creation");
      return new Response(JSON.stringify({ 
        success: true,
        message: "Corrida concluída! (Sem fornecedor associado)",
        payout_amount: result.payout_amount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Trip has supplier", { 
      supplierId: trip.supplier_id, 
      supplierName: trip.supplier.name,
      priceCustomer: trip.price_customer 
    });

    // Step 4: Create invoice for the supplier
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supplier = trip.supplier;

    // Get or create Stripe customer for supplier
    let customerId = supplier.stripe_customer_id;
    
    if (!customerId) {
      logStep("Creating Stripe customer for supplier");
      const customer = await stripe.customers.create({
        email: supplier.email,
        name: supplier.name,
        metadata: {
          supplier_id: supplier.id,
          supplier_code: supplier.code,
        },
      });
      customerId = customer.id;

      // Save Stripe customer ID
      await supabaseClient
        .from("suppliers")
        .update({ stripe_customer_id: customerId })
        .eq("id", supplier.id);

      logStep("Stripe customer created", { customerId });
    }

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: 25,
      metadata: {
        trip_id: trip_id,
        supplier_id: supplier.id,
      },
    });

    logStep("Invoice created", { invoiceId: invoice.id });

    // Add invoice item - charge the customer price
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: Math.round(trip.price_customer * 100), // Convert to cents
      currency: "brl",
      description: `Serviço de transporte - ${trip.origin_text} → ${trip.destination_text}`,
    });

    // Finalize and send invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(invoice.id);

    logStep("Invoice finalized and sent", { 
      invoiceId: finalizedInvoice.id,
      invoiceUrl: finalizedInvoice.hosted_invoice_url 
    });

    // Step 5: Update payment record
    await supabaseClient
      .from("payments")
      .upsert({
        trip_id: trip_id,
        amount: trip.price_customer,
        method: "PIX",
        gateway: "stripe",
        gateway_payment_id: finalizedInvoice.id,
        status: "pending",
      }, { onConflict: "trip_id" });

    // Step 6: Update payout with invoice ID
    await supabaseClient
      .from("payouts")
      .update({ stripe_invoice_id: finalizedInvoice.id })
      .eq("trip_id", trip_id);

    logStep("Records updated successfully");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Corrida concluída e fatura enviada ao fornecedor!",
      payout_amount: result.payout_amount,
      invoice_id: finalizedInvoice.id,
      invoice_url: finalizedInvoice.hosted_invoice_url,
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