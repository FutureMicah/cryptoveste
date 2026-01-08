import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TelegramStarsPaymentProps {
  onComplete: () => void;
}

const TelegramStarsPayment = ({ onComplete }: TelegramStarsPaymentProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  const TELEGRAM_BOT_URL = "https://t.me/BlackPalBot"; // Replace with actual bot username
  const STARS_AMOUNT = 50; // $50 worth of stars

  const handleInitiatePayment = async () => {
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create a pending payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          amount: 50,
          currency: "USD",
          payment_type: "enrollment",
          payment_provider: "telegram_stars",
          status: "pending",
          stars: STARS_AMOUNT,
          user_email: user.email,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Store payment ID for reference
      localStorage.setItem("pending_stars_payment_id", paymentData.id);

      setPaymentInitiated(true);
      toast.success("Payment initiated!", {
        description: "Complete the payment in Telegram, then return here.",
      });

      // Open Telegram bot
      window.open(`${TELEGRAM_BOT_URL}?start=pay_${paymentData.id}`, "_blank");
    } catch (error: any) {
      console.error("Stars payment error:", error);
      toast.error(error.message || "Failed to initiate payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async () => {
    setSubmitting(true);

    try {
      const paymentId = localStorage.getItem("pending_stars_payment_id");
      if (!paymentId) {
        toast.error("No pending payment found. Please initiate payment first.");
        setSubmitting(false);
        return;
      }

      // Check if payment was completed
      const { data: payment, error } = await supabase
        .from("payments")
        .select("status")
        .eq("id", paymentId)
        .single();

      if (error) throw error;

      if (payment.status === "completed") {
        localStorage.removeItem("pending_stars_payment_id");
        toast.success("Payment verified!");
        onComplete();
      } else {
        toast.info("Payment not yet confirmed", {
          description: "Please complete the payment in the Telegram bot.",
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Failed to verify payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Star className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-bold text-foreground">
            Telegram Stars Payment
          </h3>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Pay <strong className="text-foreground text-lg">$50</strong> using Telegram Stars through our bot
        </p>

        {/* How it works */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-foreground mb-3">How it works:</h4>
          <ol className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <span>Click "Pay with Telegram Stars" to open our bot</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>Complete the Stars payment in Telegram</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>Return here and click "Verify Payment"</span>
            </li>
          </ol>
        </div>

        {/* Payment Buttons */}
        <div className="space-y-3">
          {!paymentInitiated ? (
            <Button
              onClick={handleInitiatePayment}
              disabled={submitting}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              {submitting ? (
                "Processing..."
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Pay with Telegram Stars
                  <ExternalLink className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleVerifyPayment}
                disabled={submitting}
                className="w-full h-12"
              >
                {submitting ? "Verifying..." : "✓ Verify Payment"}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.open(TELEGRAM_BOT_URL, "_blank")}
                className="w-full h-10"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Open Telegram Bot Again
              </Button>
            </>
          )}
        </div>

        {/* Support */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            Having issues? Contact support:{" "}
            <a 
              href="https://t.me/Futuremicah" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @Futuremicah
            </a>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default TelegramStarsPayment;
