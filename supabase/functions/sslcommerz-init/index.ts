import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount, productName, productCategory, customerName, customerEmail, customerPhone, userId, planId, listingType } = await req.json();

    const storeId = Deno.env.get("SSLCOMMERZ_STORE_ID");
    const storePassword = Deno.env.get("SSLCOMMERZ_STORE_PASSWORD");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!storeId || !storePassword) {
      throw new Error("SSLCommerz credentials not configured");
    }

    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // SSLCommerz Sandbox URL (use https://securepay.sslcommerz.com for production)
    const sslcommerzUrl = "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";
    
    const baseUrl = req.headers.get("origin") || "http://localhost:5173";
    
    const formData = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: amount.toString(),
      currency: "BDT",
      tran_id: transactionId,
      success_url: `${baseUrl}/payment/success?tran_id=${transactionId}`,
      fail_url: `${baseUrl}/payment/failed?tran_id=${transactionId}`,
      cancel_url: `${baseUrl}/payment/cancelled?tran_id=${transactionId}`,
      ipn_url: `${supabaseUrl}/functions/v1/sslcommerz-ipn`,
      cus_name: customerName || "Customer",
      cus_email: customerEmail || "customer@email.com",
      cus_phone: customerPhone || "01700000000",
      cus_add1: "Dhaka",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      shipping_method: "NO",
      product_name: productName || "Subscription",
      product_category: productCategory || "Digital Service",
      product_profile: "non-physical-goods",
      value_a: userId || "",
      value_b: planId || "",
      value_c: listingType || "",
    });

    const response = await fetch(sslcommerzUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const result = await response.json();

    if (result.status === "SUCCESS") {
      // Store pending transaction in database
      const supabase = createClient(supabaseUrl!, supabaseKey!);
      
      await supabase.from("payment_transactions").insert({
        transaction_id: transactionId,
        user_id: userId,
        amount: amount,
        currency: "BDT",
        status: "pending",
        plan_id: planId || null,
        listing_type: listingType || null,
        gateway_response: result,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          gatewayUrl: result.GatewayPageURL,
          transactionId 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      throw new Error(result.failedreason || "Failed to initiate payment");
    }
  } catch (error: unknown) {
    console.error("SSLCommerz Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
