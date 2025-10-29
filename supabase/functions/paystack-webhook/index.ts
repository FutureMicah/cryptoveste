import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    // Verify Paystack signature
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();
    
    const hash = await crypto.subtle.digest(
      "SHA-512",
      new TextEncoder().encode(paystackSecretKey + body)
    );
    const expectedSignature = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (signature !== expectedSignature) {
      console.error("Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    console.log("Webhook event:", event.event);

    // Handle payment success
    if (event.event === "charge.success") {
      const { reference, customer, amount } = event.data;
      const email = customer.email;

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Record payment
      const { error: paymentError } = await supabase
        .from("payments")
        .upsert({
          reference,
          user_email: email,
          amount: amount / 100, // Convert from kobo to naira
          status: "completed",
          payment_method: "paystack",
        });

      if (paymentError) {
        console.error("Payment record error:", paymentError);
      }

      // Check for referral and update earnings
      const { data: payment } = await supabase
        .from("payments")
        .select("referral_code_used")
        .eq("reference", reference)
        .single();

      if (payment?.referral_code_used) {
        const { error: earningsError } = await supabase
          .from("profiles")
          .update({ 
            total_earnings: supabase.rpc("increment_earnings", { code: payment.referral_code_used, amount: 5000 })
          })
          .eq("referral_code", payment.referral_code_used);

        if (earningsError) {
          console.error("Earnings update error:", earningsError);
        }

        // Update referral status
        await supabase
          .from("referrals")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("payment_id", reference);
      }

      console.log("Payment processed successfully:", reference);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
