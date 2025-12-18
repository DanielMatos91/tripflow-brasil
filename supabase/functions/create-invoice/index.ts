import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-INVOICE] ${step}${detailsStr}`);
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
    
    const { 
      supplier_id, 
      trip_id, 
      amount, 
      description,
      due_days = 25 
    } = await req.json();

    logStep("Request data", { supplier_id, trip_id, amount, due_days });

    // Get supplier info
    const { data: supplier, error: supplierError } = await supabaseClient
      .from("suppliers")
      .select("*")
      .eq("id", supplier_id)
      .maybeSingle();

    if (supplierError || !supplier) {
      throw new Error("Supplier not found");
    }

    logStep("Supplier found", { name: supplier.name, email: supplier.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

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
        .eq("id", supplier_id);

      logStep("Stripe customer created", { customerId });
    }

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: due_days,
      metadata: {
        trip_id: trip_id || "",
        supplier_id: supplier_id,
      },
    });

    logStep("Invoice created", { invoiceId: invoice.id });

    // Add invoice item
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: Math.round(amount * 100), // Convert to cents
      currency: "brl",
      description: description || `Serviço de transporte - ${supplier.code}`,
    });

    logStep("Invoice item added");

    // Finalize and send invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
    await stripe.invoices.sendInvoice(invoice.id);

    logStep("Invoice finalized and sent", { 
      invoiceId: finalizedInvoice.id,
      invoiceUrl: finalizedInvoice.hosted_invoice_url 
    });

    // Update payment record if trip_id provided
    if (trip_id) {
      await supabaseClient
        .from("payments")
        .upsert({
          trip_id: trip_id,
          amount: amount,
          method: "PIX",
          gateway: "stripe",
          gateway_payment_id: finalizedInvoice.id,
          status: "pending",
        }, { onConflict: "trip_id" });

      logStep("Payment record updated");
    }

    return new Response(JSON.stringify({ 
      success: true,
      invoice_id: finalizedInvoice.id,
      invoice_url: finalizedInvoice.hosted_invoice_url,
      invoice_pdf: finalizedInvoice.invoice_pdf,
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
