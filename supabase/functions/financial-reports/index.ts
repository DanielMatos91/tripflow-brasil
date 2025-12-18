import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FINANCIAL-REPORTS] ${step}${detailsStr}`);
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

    const { start_date, end_date } = await req.json();
    logStep("Request data", { start_date, end_date });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get Stripe balance
    const balance = await stripe.balance.retrieve();
    logStep("Stripe balance retrieved");

    // Get payment intents for the period
    const startTimestamp = new Date(start_date).getTime() / 1000;
    const endTimestamp = new Date(end_date).getTime() / 1000;

    const paymentIntents = await stripe.paymentIntents.list({
      created: {
        gte: Math.floor(startTimestamp),
        lte: Math.floor(endTimestamp),
      },
      limit: 100,
    });

    // Get invoices for the period
    const invoices = await stripe.invoices.list({
      created: {
        gte: Math.floor(startTimestamp),
        lte: Math.floor(endTimestamp),
      },
      limit: 100,
    });

    // Get transfers (payouts to connected accounts)
    const transfers = await stripe.transfers.list({
      created: {
        gte: Math.floor(startTimestamp),
        lte: Math.floor(endTimestamp),
      },
      limit: 100,
    });

    logStep("Stripe data retrieved", {
      paymentIntents: paymentIntents.data.length,
      invoices: invoices.data.length,
      transfers: transfers.data.length,
    });

    // Get local data from Supabase
    const { data: trips } = await supabaseClient
      .from("trips")
      .select("*, supplier:suppliers(name, code)")
      .gte("created_at", start_date)
      .lte("created_at", end_date);

    const { data: payouts } = await supabaseClient
      .from("payouts")
      .select("*")
      .gte("created_at", start_date)
      .lte("created_at", end_date);

    // Calculate metrics
    const totalRevenue = paymentIntents.data
      .filter((pi: any) => pi.status === "succeeded")
      .reduce((sum: number, pi: any) => sum + pi.amount, 0) / 100;

    const totalInvoiced = invoices.data
      .reduce((sum: number, inv: any) => sum + (inv.amount_due || 0), 0) / 100;

    const totalPaidInvoices = invoices.data
      .filter((inv: any) => inv.status === "paid")
      .reduce((sum: number, inv: any) => sum + (inv.amount_paid || 0), 0) / 100;

    const totalPendingInvoices = invoices.data
      .filter((inv: any) => inv.status === "open")
      .reduce((sum: number, inv: any) => sum + (inv.amount_due || 0), 0) / 100;

    const totalTransfers = transfers.data
      .reduce((sum: number, tr: any) => sum + tr.amount, 0) / 100;

    const tripStats = trips?.reduce((acc, trip) => {
      acc.totalCustomerPrice += Number(trip.price_customer) || 0;
      acc.totalDriverPayout += Number(trip.payout_driver) || 0;
      acc.totalMargin += Number(trip.calculated_margin) || 0;
      return acc;
    }, { totalCustomerPrice: 0, totalDriverPayout: 0, totalMargin: 0 }) || { totalCustomerPrice: 0, totalDriverPayout: 0, totalMargin: 0 };

    const pendingPayouts = payouts?.filter(p => p.status === "pending")
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const paidPayouts = payouts?.filter(p => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Group by supplier
    const bySupplier = trips?.reduce((acc: any, trip) => {
      const supplierKey = trip.supplier?.code || "SEM_FORNECEDOR";
      if (!acc[supplierKey]) {
        acc[supplierKey] = {
          name: trip.supplier?.name || "Sem Fornecedor",
          code: supplierKey,
          trips: 0,
          revenue: 0,
          margin: 0,
        };
      }
      acc[supplierKey].trips++;
      acc[supplierKey].revenue += Number(trip.price_customer) || 0;
      acc[supplierKey].margin += Number(trip.calculated_margin) || 0;
      return acc;
    }, {}) || {};

    const report = {
      period: { start_date, end_date },
      stripe: {
      balance: {
        available: balance.available.reduce((sum: number, b: any) => sum + b.amount, 0) / 100,
        pending: balance.pending.reduce((sum: number, b: any) => sum + b.amount, 0) / 100,
      },
        revenue: totalRevenue,
        invoiced: totalInvoiced,
        paid_invoices: totalPaidInvoices,
        pending_invoices: totalPendingInvoices,
        transfers: totalTransfers,
      },
      trips: {
        count: trips?.length || 0,
        customer_revenue: tripStats.totalCustomerPrice,
        driver_costs: tripStats.totalDriverPayout,
        gross_margin: tripStats.totalMargin,
      },
      payouts: {
        pending: pendingPayouts,
        paid: paidPayouts,
        total: pendingPayouts + paidPayouts,
      },
      by_supplier: Object.values(bySupplier),
    };

    logStep("Report generated", { tripCount: trips?.length });

    return new Response(JSON.stringify(report), {
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
