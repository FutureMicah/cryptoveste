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

const CRYPTO_WALLETS = {
  USDT_TRC20: "TYourWalletAddressHere123456789",
  USDT_ERC20: "0xYourEthereumAddressHere123456789",
  BTC: "bc1YourBitcoinAddressHere123456789",
  ETH: "0xYourEthereumAddressHere123456789",
  USDC: "0xYourUSDCAddressHere123456789",
};

const CryptoPayment = ({ amount, currency, onComplete }: CryptoPaymentProps) => {
  const [selectedCrypto, setSelectedCrypto] = useState<keyof typeof CRYPTO_WALLETS | null>(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [senderWallet, setSenderWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const cryptoOptions = [
    { id: "USDT_TRC20", name: "USDT (TRC-20)", icon: "₮", network: "Tron", fee: "Low" },
    { id: "USDT_ERC20", name: "USDT (ERC-20)", icon: "₮", network: "Ethereum", fee: "High" },
    { id: "BTC", name: "Bitcoin", icon: "₿", network: "Bitcoin", fee: "Medium" },
    { id: "ETH", name: "Ethereum", icon: "Ξ", network: "Ethereum", fee: "High" },
    { id: "USDC", name: "USD Coin", icon: "$", network: "Ethereum", fee: "High" },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleSubmit = async () => {
    if (!selectedCrypto || !transactionHash || !senderWallet) {
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
          amount: amount,
          currency: currency,
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
          cryptocurrency: selectedCrypto,
          wallet_address: senderWallet,
          expected_amount: amount,
          transaction_hash: transactionHash,
          network: cryptoOptions.find(c => c.id === selectedCrypto)?.network,
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
            Cryptocurrency Payment
          </h3>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Send exactly <strong className="text-foreground">{currency}{amount}</strong> equivalent in crypto to complete your payment
        </p>

        {/* Crypto Selection */}
        <div className="space-y-3 mb-6">
          <label className="text-sm font-medium text-foreground">
            Select Cryptocurrency
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cryptoOptions.map((crypto) => (
              <button
                key={crypto.id}
                onClick={() => setSelectedCrypto(crypto.id as keyof typeof CRYPTO_WALLETS)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedCrypto === crypto.id
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{crypto.icon}</span>
                    <span className="font-medium text-foreground">{crypto.name}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Network: {crypto.network}</div>
                  <div>Fee: {crypto.fee}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Wallet Address Display */}
        {selectedCrypto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4"
          >
            <div className="bg-background/50 rounded-lg p-4 border border-border/50">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Send to this address:
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-muted/30 p-3 rounded break-all">
                  {CRYPTO_WALLETS[selectedCrypto]}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(CRYPTO_WALLETS[selectedCrypto])}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Transaction Details */}
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
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default CryptoPayment;
