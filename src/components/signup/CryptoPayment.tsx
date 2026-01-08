import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, CheckCircle2, Bitcoin, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import FloatingInput from "../FloatingInput";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CryptoPaymentProps {
  amount: number;
  currency: string;
  onComplete: () => void;
}

// Official wallet address for USDT payments
const USDT_BEP20_ADDRESS = "0x37e39CcC88bfcD0a78087DD1188619530C355a95";

const CryptoPayment = ({ amount, currency, onComplete }: CryptoPaymentProps) => {
  const [transactionHash, setTransactionHash] = useState("");
  const [senderWallet, setSenderWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleSubmit = async () => {
    if (!transactionHash || !senderWallet) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Not authenticated");

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: user.data.user.id,
          amount: 50, // Fixed $50 USDT
          currency: "USDT",
          payment_type: "enrollment",
          payment_provider: "crypto",
          status: "pending",
          stars: 0,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create crypto payment record
      const { error: cryptoError } = await supabase
        .from("crypto_payments")
        .insert({
          user_id: user.data.user.id,
          payment_id: paymentData.id,
          cryptocurrency: "USDT_BEP20",
          wallet_address: senderWallet,
          expected_amount: 50,
          transaction_hash: transactionHash,
          network: "BEP20",
          status: "pending",
        });

      if (cryptoError) throw cryptoError;

      toast.success("Crypto payment submitted!", {
        description: "Your transaction is being verified. This may take a few minutes.",
      });

      onComplete();
    } catch (error: any) {
      console.error("Crypto payment error:", error);
      toast.error(error.message || "Failed to submit crypto payment");
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
          <Bitcoin className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-bold text-foreground">
            USDT Payment (BEP20)
          </h3>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Send exactly <strong className="text-foreground text-lg">$50 USDT</strong> to complete your enrollment
        </p>

        {/* Network Info */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-primary uppercase">Network</span>
          </div>
          <p className="text-foreground font-bold">BEP20 (Binance Smart Chain)</p>
          <p className="text-xs text-muted-foreground mt-1">
            ⚠️ Only send USDT on BEP20 network. Other networks will result in lost funds.
          </p>
        </div>

        {/* Wallet Address Display */}
        <div className="bg-background/50 rounded-lg p-4 border border-border/50 mb-6">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Send USDT to this address:
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-muted/30 p-3 rounded break-all text-foreground">
              {USDT_BEP20_ADDRESS}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(USDT_BEP20_ADDRESS)}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-4">
          <FloatingInput
            label="Your Wallet Address"
            icon={<Wallet className="w-5 h-5" />}
            value={senderWallet}
            onChange={(e) => setSenderWallet(e.target.value)}
            placeholder="Enter your wallet address"
            required
          />

          <FloatingInput
            label="Transaction Hash / TX ID"
            icon={<CheckCircle2 className="w-5 h-5" />}
            value={transactionHash}
            onChange={(e) => setTransactionHash(e.target.value)}
            placeholder="Enter transaction hash after sending"
            required
          />

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-12"
          >
            {submitting ? "Submitting..." : "Submit Payment"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            ⚠️ Please wait for blockchain confirmations. Verification may take 10-30 minutes.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default CryptoPayment;
