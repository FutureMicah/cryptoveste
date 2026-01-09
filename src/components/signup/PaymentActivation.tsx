import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CreditCard, Bitcoin, Star, Globe } from "lucide-react";
import { usePaystackPayment } from "react-paystack";
import { toast } from "sonner";
import { PaymentScreenshotUpload } from "./PaymentScreenshotUpload";
import { PaymentVerificationSuccess } from "./PaymentVerificationSuccess";
import CryptoPayment from "./CryptoPayment";
import TelegramStarsPayment from "./TelegramStarsPayment";
import { supabase } from "@/integrations/supabase/client";

interface PaymentActivationProps {
  userData: any;
  countryInfo: any;
  onComplete: () => void;
}

const PaymentActivation = ({ userData, countryInfo, onComplete }: PaymentActivationProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showScreenshotUpload, setShowScreenshotUpload] = useState(false);
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  const [activePaymentView, setActivePaymentView] = useState<"crypto" | "stars" | null>(null);

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";

  const paystackConfig = {
    reference: `BP_${new Date().getTime()}_${Math.random().toString(36).substring(7)}`,
    email: userData.formData.email,
    amount: countryInfo.fee * 100, // Convert to kobo for Paystack
    publicKey: publicKey,
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handlePaystackPayment = () => {
    if (!publicKey) {
      toast.error("Payment system not configured");
      return;
    }

    setIsProcessing(true);

    initializePayment({
      onSuccess: () => {
        toast.success("Payment initiated! Please upload your payment screenshot.");
        setShowScreenshotUpload(true);
        setIsProcessing(false);
      },
      onClose: () => {
        toast.error("Payment cancelled");
        setIsProcessing(false);
      },
    });
  };

  const handleCryptoPayment = () => {
    setActivePaymentView("crypto");
  };

  const handleStarsPayment = () => {
    setActivePaymentView("stars");
  };

  // Payment methods based on location
  const isNigeria = countryInfo?.zone === "nigeria";

  const paymentMethods = isNigeria
    ? [
        {
          id: "paystack",
          name: "Card Payment",
          icon: <CreditCard className="w-6 h-6" />,
          description: "Debit/Credit Card via Paystack",
          available: true,
          handler: handlePaystackPayment,
        },
      ]
    : [
        {
          id: "crypto",
          name: "USDT (BEP20)",
          icon: <Bitcoin className="w-6 h-6" />,
          description: "Pay $50 USDT on Binance Smart Chain",
          available: true,
          handler: handleCryptoPayment,
        },
        {
          id: "telegram_stars",
          name: "Telegram Stars",
          icon: <Star className="w-6 h-6 text-yellow-500" />,
          description: "Pay $50 via Telegram Stars",
          available: true,
          handler: handleStarsPayment,
        },
      ];

  return (
    <>
      <AnimatePresence>
        {showVerificationSuccess && (
          <PaymentVerificationSuccess 
            onComplete={onComplete} 
            userName={userData?.formData?.firstName || "Member"}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl mx-auto px-4"
      >
        <div className="glass-card rounded-3xl p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-4xl font-bold text-foreground mb-2"
            >
              Activate Your Account
            </motion.h1>
            <p className="text-muted-foreground">
              Complete payment to unlock full access
            </p>
          </div>

          {/* Country & Fee Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-6 mb-8 border border-primary/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Your Location</p>
                <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                  {countryInfo?.flag && countryInfo.flag.startsWith('http') ? (
                    <img src={countryInfo.flag} alt="" className="w-6 h-4 rounded" />
                  ) : (
                    <Globe className="w-5 h-5 text-primary" />
                  )}
                  {countryInfo?.country || "International"}
                  {countryInfo?.countryCode && (
                    <span className="text-xs text-muted-foreground">({countryInfo.countryCode})</span>
                  )}
                </p>
                {countryInfo?.city && (
                  <p className="text-xs text-muted-foreground">
                    {countryInfo.city}{countryInfo.region ? `, ${countryInfo.region}` : ''}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Enrollment Fee</p>
                <p className="text-2xl font-bold text-primary">
                  {countryInfo?.currency} {countryInfo?.fee?.toLocaleString()}
                </p>
              </div>
            </div>

            {!isNigeria && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  💎 Pay with USDT (BEP20) or Telegram Stars
                </p>
              </div>
            )}
          </motion.div>

          {/* Payment Methods */}
          {activePaymentView === "crypto" ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePaymentView(null)}
                className="mb-2"
              >
                ← Back to payment options
              </Button>
              <CryptoPayment
                amount={50}
                currency="USDT"
                onComplete={() => setShowVerificationSuccess(true)}
              />
            </div>
          ) : activePaymentView === "stars" ? (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePaymentView(null)}
                className="mb-2"
              >
                ← Back to payment options
              </Button>
              <TelegramStarsPayment
                onComplete={() => setShowVerificationSuccess(true)}
              />
            </div>
          ) : !showScreenshotUpload ? (
            <>
              <div className="space-y-4 mb-8">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Select Payment Method
                </h3>
                
                {paymentMethods.map((method, index) => (
                  <motion.button
                    key={method.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      if (method.available) {
                        setSelectedMethod(method.id);
                        // For non-Paystack methods, go directly to the payment view
                        if (method.id === "crypto") {
                          handleCryptoPayment();
                        } else if (method.id === "telegram_stars") {
                          handleStarsPayment();
                        }
                      }
                    }}
                    disabled={!method.available}
                    className={`w-full p-5 rounded-xl border-2 transition-all ${
                      method.available
                        ? selectedMethod === method.id
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/50 bg-background/50"
                        : "border-border/30 bg-muted/20 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${method.available ? "text-primary" : "text-muted-foreground"}`}>
                        {method.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-foreground">{method.name}</p>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Only show "Proceed to Payment" for Paystack */}
              {isNigeria && (
                <Button
                  onClick={() => {
                    const method = paymentMethods.find(m => m.id === selectedMethod);
                    if (method && method.available) {
                      method.handler();
                    } else {
                      toast.error("Please select a payment method");
                    }
                  }}
                  disabled={!selectedMethod || isProcessing}
                  className="w-full h-14 text-lg font-semibold"
                >
                  {isProcessing ? "Processing..." : "Proceed to Payment"}
                </Button>
              )}
            </>
          ) : (
            <PaymentScreenshotUpload
              expectedAmount={countryInfo.fee}
              currency={countryInfo.currency}
              onVerified={() => setShowVerificationSuccess(true)}
              userFullName={`${userData.formData.firstName} ${userData.formData.lastName}`}
            />
          )}

          {/* Security Badge */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-center text-muted-foreground mt-6"
          >
            🔒 Secure payment processing • Your data is encrypted
          </motion.p>
        </div>
      </motion.div>
    </>
  );
};

export default PaymentActivation;
