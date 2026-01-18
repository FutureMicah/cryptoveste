import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Check, Building2, User, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import FloatingInput from "../FloatingInput";
import { PaymentScreenshotUpload } from "./PaymentScreenshotUpload";

interface NigerianBankPaymentProps {
  amount: number;
  currency: string;
  userFullName: string;
  onComplete: () => void;
}

const NigerianBankPayment = ({ amount, currency, userFullName, onComplete }: NigerianBankPaymentProps) => {
  const [step, setStep] = useState<"details" | "upload">("details");
  const [senderAccountName, setSenderAccountName] = useState("");
  const [senderAccountNumber, setSenderAccountNumber] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Load bank details from admin settings
  const [bankDetails, setBankDetails] = useState({
    bankName: "Opay",
    accountNumber: "1234567890",
    accountName: "BlackPAL Trading",
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem("adminSettings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.bankName && settings.accountNumber && settings.accountName) {
          setBankDetails({
            bankName: settings.bankName,
            accountNumber: settings.accountNumber,
            accountName: settings.accountName,
          });
        }
      } catch (e) {
        console.error("Failed to load admin settings:", e);
      }
    }
  }, []);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleProceed = () => {
    if (!senderAccountName.trim()) {
      toast.error("Please enter your account name");
      return;
    }
    if (!senderAccountNumber.trim() || senderAccountNumber.length < 10) {
      toast.error("Please enter a valid 10-digit account number");
      return;
    }
    setStep("upload");
  };

  if (step === "upload") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        {/* Required Notice at Top */}
        <div className="p-4 rounded-xl bg-primary/10 border-2 border-primary/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📸</span>
            <div>
              <p className="font-bold text-foreground text-lg">Payment Screenshot Required</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your payment screenshot to continue. This is mandatory for account activation.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep("details")}
          className="mb-2"
        >
          ← Back to bank details
        </Button>
        
        <PaymentScreenshotUpload
          expectedAmount={50000}
          currency={currency}
          onVerified={onComplete}
          userFullName={userFullName}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Amount Display */}
      <Card className="p-4 bg-primary/10 border-primary/30">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
          <p className="text-3xl font-bold text-primary">
            ₦50,000
          </p>
          <p className="text-xs text-muted-foreground mt-1">Fifty Thousand Naira Only</p>
        </div>
      </Card>

      {/* Bank Details */}
      <Card className="p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Transfer to this account
        </h3>

        {/* Bank Name */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div>
            <p className="text-xs text-muted-foreground">Bank Name</p>
            <p className="font-semibold text-foreground">{bankDetails.bankName}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(bankDetails.bankName, "bank")}
          >
            {copied === "bank" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Account Number */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div>
            <p className="text-xs text-muted-foreground">Account Number</p>
            <p className="font-semibold text-foreground font-mono text-lg">{bankDetails.accountNumber}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(bankDetails.accountNumber, "number")}
          >
            {copied === "number" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Account Name */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div>
            <p className="text-xs text-muted-foreground">Account Name</p>
            <p className="font-semibold text-foreground">{bankDetails.accountName}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(bankDetails.accountName, "name")}
          >
            {copied === "name" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </Card>

      {/* Sender Details */}
      <Card className="p-4 sm:p-6 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Your Payment Details
        </h3>
        <p className="text-sm text-muted-foreground">
          Enter your bank account details used for the transfer
        </p>

        <FloatingInput
          label="Your Account Name"
          icon={<User className="w-5 h-5" />}
          value={senderAccountName}
          onChange={(e) => setSenderAccountName(e.target.value)}
          placeholder="Name on your bank account"
          required
        />

        <FloatingInput
          label="Your Account Number"
          icon={<CreditCard className="w-5 h-5" />}
          value={senderAccountNumber}
          onChange={(e) => setSenderAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit account number"
          required
        />
      </Card>

      {/* Warning */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-yellow-500">Important</p>
          <p className="text-muted-foreground">
            Make sure your account name matches your signup name: <strong>{userFullName}</strong>
          </p>
        </div>
      </div>

      {/* Proceed Button */}
      <Button
        onClick={handleProceed}
        className="w-full h-12 text-base font-semibold"
      >
        I've Made the Transfer → Upload Screenshot
      </Button>
    </motion.div>
  );
};

export default NigerianBankPayment;
