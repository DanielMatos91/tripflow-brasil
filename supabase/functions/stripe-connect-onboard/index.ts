import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-ONBOARD] ${step}${detailsStr}`);
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

    const { type, entity_id } = await req.json();
    logStep("Request data", { type, entity_id, userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://lovable.app";

    let entity: any;
    let email: string;
    let tableName: string;

    if (type === "driver") {
      tableName = "drivers";
      const { data, error } = await supabaseClient
        .from("drivers")
        .select("*, profile:profiles(name, email)")
        .eq("id", entity_id)
        .maybeSingle();
      
      if (error || !data) throw new Error("Driver not found");
      entity = data;
      email = data.profile?.email || "";
      logStep("Driver found", { name: data.profile?.name, email });
    } else if (type === "fleet") {
      tableName = "fleets";
      const { data, error } = await supabaseClient
        .from("fleets")
        .select("*")
        .eq("id", entity_id)
        .maybeSingle();
      
      if (error || !data) throw new Error("Fleet not found");
      entity = data;
      email = data.contact_email || "";
      logStep("Fleet found", { name: data.company_name, email });
    } else {
      throw new Error("Invalid type. Must be 'driver' or 'fleet'");
    }

    // Check if already has Stripe account
    if (entity.stripe_account_id) {
      logStep("Account already exists, creating login link");
      
      const loginLink = await stripe.accounts.createLoginLink(entity.stripe_account_id);
      
      return new Response(JSON.stringify({ 
        success: true,
        url: loginLink.url,
        account_id: entity.stripe_account_id,
        already_connected: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create Stripe Connect Express account
    logStep("Creating new Connect account");
    const account = await stripe.accounts.create({
      type: "express",
      country: "BR",
      email: email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: type === "fleet" ? "company" : "individual",
      metadata: {
        entity_type: type,
        entity_id: entity_id,
      },
    });

    logStep("Account created", { accountId: account.id });

    // Save Stripe account ID
    await supabaseClient
      .from(tableName)
      .update({ stripe_account_id: account.id })
      .eq("id", entity_id);

    logStep("Account ID saved to database");

    // Create account link for onboarding
    // Use driver-specific URLs for drivers
    const returnPath = type === "driver" 
      ? "/driver/payouts" 
      : `/admin/${type}s/${entity_id}`;
    
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}${returnPath}?stripe_refresh=true`,
      return_url: `${origin}${returnPath}?stripe_success=true`,
      type: "account_onboarding",
    });

    logStep("Account link created", { url: accountLink.url });

    return new Response(JSON.stringify({ 
      success: true,
      url: accountLink.url,
      account_id: account.id,
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
