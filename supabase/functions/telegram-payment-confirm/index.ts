import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramPaymentRequest {
  payment_id: string;
  telegram_user_id: number;
  stars_amount: number;
  telegram_payment_charge_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { payment_id, telegram_user_id, stars_amount, telegram_payment_charge_id }: TelegramPaymentRequest = await req.json();

    console.log("Telegram payment confirmation received:", { payment_id, telegram_user_id, stars_amount });

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: "payment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the payment status to completed
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .update({
        status: "completed",
        transaction_id: telegram_payment_charge_id,
        stars: stars_amount || 50,
      })
      .eq("id", payment_id)
      .eq("payment_provider", "telegram_stars")
      .select("*, profiles:user_id (first_name, last_name)")
      .single();

    if (paymentError) {
      console.error("Payment update error:", paymentError);
      return new Response(
        JSON.stringify({ error: "Failed to update payment", details: paymentError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payment) {
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update telegram_id in profile if provided
    if (telegram_user_id && payment.user_id) {
      await supabase
        .from("profiles")
        .update({ telegram_id: telegram_user_id })
        .eq("id", payment.user_id);
    }

    // Send notification email with group links
    try {
      await supabase.functions.invoke("send-notification", {
        body: {
          userId: payment.user_id,
          type: "payment_approved",
          data: {
            paymentMethod: "Telegram Stars",
            amount: "$50",
          },
        },
      });
      console.log("Notification sent successfully");
    } catch (notifError) {
      console.error("Notification error (non-fatal):", notifError);
    }

    // Return success with group links for the bot to send
    const response = {
      success: true,
      message: "Payment confirmed successfully",
      user_name: payment.profiles?.first_name || "Member",
      group_links: {
        private_group: "https://t.me/+J0p7oeR8r4k3Yjg0",
        free_channel: "https://t.me/BLACKTRADEACADEMYfreechannel",
        support: "@Futuremicah",
      },
    };

    console.log("Payment confirmed successfully:", payment_id);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Telegram payment confirmation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
