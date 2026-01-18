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
      const { reference, customer, amount, metadata } = event.data;
      const email = customer.email;

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Find the payment by reference or create new one
      const { data: existingPayment, error: findError } = await supabase
        .from("payments")
        .select("*")
        .eq("reference", reference)
        .maybeSingle();

      if (findError) {
        console.error("Error finding payment:", findError);
      }

      // Record or update payment
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .upsert({
          id: existingPayment?.id,
          reference,
          user_email: email,
          user_id: existingPayment?.user_id || metadata?.user_id,
          amount: amount / 100, // Convert from kobo to naira
          currency: "NGN",
          payment_type: "enrollment",
          status: "completed",
          payment_method: "paystack",
          referral_code_used: existingPayment?.referral_code_used || metadata?.referral_code,
        }, {
          onConflict: "reference"
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Payment record error:", paymentError);
        return new Response(JSON.stringify({ error: "Payment update failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Payment verified successfully:", reference);

      // Auto-verify any pending payment proofs for this payment
      if (payment?.id) {
        const { error: proofError } = await supabase
          .from("payment_proofs")
          .update({
            status: "auto_verified",
            verified_at: new Date().toISOString(),
          })
          .eq("payment_id", payment.id)
          .eq("status", "submitted");

        if (proofError) {
          console.error("Error auto-verifying proof:", proofError);
        } else {
          console.log("Auto-verified payment proofs for payment:", payment.id);
        }
      }

      // Check for referral and update earnings
      if (payment?.referral_code_used) {
        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("id, total_earnings, referral_code")
          .eq("referral_code", payment.referral_code_used)
          .single();

        if (referrerProfile) {
          const newEarnings = (referrerProfile.total_earnings || 0) + 5000;
          
          const { error: earningsError } = await supabase
            .from("profiles")
            .update({ total_earnings: newEarnings })
            .eq("referral_code", payment.referral_code_used);

          if (earningsError) {
            console.error("Earnings update error:", earningsError);
          } else {
            console.log("Updated referrer earnings:", newEarnings);
            
            // Send referral earnings notification email
            try {
              await supabase.functions.invoke("send-notification", {
                body: {
                  userId: referrerProfile.id,
                  type: "referral_earnings",
                  data: {
                    refereeName: email,
                    totalEarnings: newEarnings,
                  },
                },
              });
              console.log("Referral earnings email sent to:", referrerProfile.id);
            } catch (emailError) {
              console.error("Failed to send referral email:", emailError);
            }
          }

          // Update referral status
          await supabase
            .from("referrals")
            .update({ 
              status: "completed", 
              completed_at: new Date().toISOString(),
              amount: 5000 
            })
            .eq("payment_id", payment.id);
        }
      }

      console.log("Payment processing complete:", reference);
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
