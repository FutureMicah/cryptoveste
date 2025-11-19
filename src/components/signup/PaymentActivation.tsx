import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CreditCard, Bitcoin, Building2, Wallet } from "lucide-react";
import { usePaystackPayment } from "react-paystack";
import { toast } from "sonner";
import { PaymentScreenshotUpload } from "./PaymentScreenshotUpload";
import { PaymentVerificationSuccess } from "./PaymentVerificationSuccess";
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
    toast.info("Crypto payment integration coming soon");
    // This would open the crypto invoice widget
  };

  const paymentMethods = [
    {
      id: "paystack",
      name: "Card Payment",
      icon: <CreditCard className="w-6 h-6" />,
      description: "Debit/Credit Card via Paystack",
      available: countryInfo?.paymentMethods?.includes("paystack"),
      handler: handlePaystackPayment,
    },
    {
      id: "flutterwave",
      name: "Flutterwave",
      icon: <Wallet className="w-6 h-6" />,
      description: "Pay with Flutterwave",
      available: countryInfo?.paymentMethods?.includes("flutterwave"),
      handler: () => toast.info("Flutterwave integration coming soon"),
    },
    {
      id: "bank",
      name: "Bank Transfer",
      icon: <Building2 className="w-6 h-6" />,
      description: "Direct bank transfer",
      available: countryInfo?.paymentMethods?.includes("bank"),
      handler: () => toast.info("Bank transfer details will be provided"),
    },
    {
      id: "crypto",
      name: "Cryptocurrency",
      icon: <Bitcoin className="w-6 h-6" />,
      description: "USDT, BTC, ETH",
      available: countryInfo?.paymentMethods?.includes("crypto"),
      handler: handleCryptoPayment,
    },
  ];

  return (
    <>
      <AnimatePresence>
        {showVerificationSuccess && (
          <PaymentVerificationSuccess onComplete={onComplete} />
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
              <p className="text-sm text-muted-foreground">Your Region</p>
              <p className="text-lg font-semibold text-foreground flex items-center gap-2">
                {countryInfo?.flag && (
                  <img src={countryInfo.flag} alt="" className="w-6 h-4 rounded" />
                )}
                {countryInfo?.country}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Enrollment Fee</p>
              <p className="text-2xl font-bold text-primary">
                {countryInfo?.currency} {countryInfo?.fee?.toLocaleString()}
              </p>
            </div>
          </div>

          {countryInfo?.zone !== "nigeria" && (
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                ⚠️ Cryptocurrency payment required for your region
              </p>
            </div>
          )}
        </motion.div>

        {/* Payment Methods */}
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
                {!method.available && (
                  <span className="text-xs text-muted-foreground">
                    Unavailable for your region
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Proceed Button */}
        {!showScreenshotUpload ? (
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
        ) : (
          <PaymentScreenshotUpload
            expectedAmount={countryInfo.fee}
            currency={countryInfo.currency}
            onVerified={() => setShowVerificationSuccess(true)}
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
