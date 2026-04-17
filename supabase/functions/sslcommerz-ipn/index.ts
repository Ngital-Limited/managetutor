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
    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    const storeId = Deno.env.get("SSLCOMMERZ_STORE_ID");
    const storePassword = Deno.env.get("SSLCOMMERZ_STORE_PASSWORD");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const transactionId = data.tran_id;
    const status = data.status;
    const valId = data.val_id;
    const amount = parseFloat(data.amount || "0");
    const userId = data.value_a;
    const planId = data.value_b;
    const listingType = data.value_c;
    const jobId = data.value_d;

    // Validate the transaction with SSLCommerz
    if (status === "VALID" || status === "VALIDATED") {
      const validationUrl = `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${storeId}&store_passwd=${storePassword}&format=json`;
      
      const validationResponse = await fetch(validationUrl);
      const validationResult = await validationResponse.json();

      if (validationResult.status === "VALID" || validationResult.status === "VALIDATED") {
        // Update transaction status
        await supabase
          .from("payment_transactions")
          .update({ 
            status: "completed",
            validation_id: valId,
            gateway_response: validationResult,
            completed_at: new Date().toISOString()
          })
          .eq("transaction_id", transactionId);

        // Process based on payment type
        if (planId && userId) {
          // Subscription payment
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("*")
            .eq("id", planId)
            .single();

          if (plan) {
            const periodStart = new Date();
            const periodEnd = new Date();
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            await supabase.from("user_subscriptions").upsert({
              user_id: userId,
              plan_id: planId,
              status: "active",
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
              applications_used: 0,
            }, { onConflict: "user_id" });
          }
        }

        if (listingType === 'verification_badge' && userId) {
          // Verification badge payment - mark tutor as verified
          const { data: tutorProfile } = await supabase
            .from("tutor_profiles")
            .select("id")
            .eq("user_id", userId)
            .single();

          if (tutorProfile) {
            await supabase
              .from("tutor_profiles")
              .update({ 
                verification_status: "approved", 
                verified_at: new Date().toISOString() 
              })
              .eq("id", tutorProfile.id);

            // Notify tutor
            await supabase.from("notifications").insert({
              user_id: userId,
              title: "Verified! ✅",
              message: "Congratulations! Your profile is now verified. The verified badge is now visible on your profile.",
              type: "verification",
            });
          }
        } else if (listingType === 'job_post' && jobId && userId) {
          // Featured job listing payment
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 30);

          await supabase.from("featured_listings").insert({
            job_id: jobId,
            listing_type: 'job_post',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            amount_paid: Math.round(amount),
            is_active: true,
          });

          await supabase
            .from("jobs")
            .update({ is_featured: true })
            .eq("id", jobId);

          await supabase.from("notifications").insert({
            user_id: userId,
            title: "Job Boosted! 🚀",
            message: "Your job post is now featured for 30 days and will appear at the top of search results.",
            type: "job_boost",
            reference_id: jobId,
          });
        } else if (listingType && userId) {
          // Featured tutor listing payment
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 30);

          const { data: tutorProfile } = await supabase
            .from("tutor_profiles")
            .select("id")
            .eq("user_id", userId)
            .single();

          if (tutorProfile) {
            await supabase.from("featured_listings").insert({
              tutor_id: tutorProfile.id,
              listing_type: listingType,
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              amount_paid: Math.round(amount),
              is_active: true,
            });

            await supabase
              .from("tutor_profiles")
              .update({ is_featured: true })
              .eq("id", tutorProfile.id);

            await supabase.from("notifications").insert({
              user_id: userId,
              title: "Profile Boosted! ⭐",
              message: "Your profile is now featured for 30 days and will appear at the top of search results.",
              type: "profile_boost",
            });
          }
        }

        return new Response("IPN_SUCCESS", { headers: corsHeaders });
      }
    }

    // Failed or cancelled transaction
    await supabase
      .from("payment_transactions")
      .update({ 
        status: status === "FAILED" ? "failed" : "cancelled",
        gateway_response: data 
      })
      .eq("transaction_id", transactionId);

    return new Response("IPN_PROCESSED", { headers: corsHeaders });

  } catch (error) {
    console.error("IPN Error:", error);
    return new Response("IPN_ERROR", { status: 500, headers: corsHeaders });
  }
});
