import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, CreditCard, User, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FloatingInput from "./FloatingInput";

interface BankDetailsFormProps {
  userId: string;
  onSaved?: () => void;
  existingDetails?: {
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
  };
}

const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Globus Bank",
  "Guaranty Trust Bank (GTBank)",
  "Heritage Bank",
  "Jaiz Bank",
  "Keystone Bank",
  "Kuda Bank",
  "Moniepoint",
  "Opay",
  "PalmPay",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "SunTrust Bank",
  "Titan Trust Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Unity Bank",
  "VFD Microfinance Bank",
  "Wema Bank",
  "Zenith Bank",
];

const BankDetailsForm = ({ userId, onSaved, existingDetails }: BankDetailsFormProps) => {
  const [bankName, setBankName] = useState(existingDetails?.bank_name || "");
  const [accountNumber, setAccountNumber] = useState(existingDetails?.bank_account_number || "");
  const [accountName, setAccountName] = useState(existingDetails?.bank_account_name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existingDetails) {
      setBankName(existingDetails.bank_name || "");
      setAccountNumber(existingDetails.bank_account_number || "");
      setAccountName(existingDetails.bank_account_name || "");
    }
  }, [existingDetails]);

  const handleSave = async () => {
    if (!bankName.trim()) {
      toast.error("Please select a bank");
      return;
    }
    if (!accountNumber.trim() || accountNumber.length !== 10) {
      toast.error("Please enter a valid 10-digit account number");
      return;
    }
    if (!accountName.trim()) {
      toast.error("Please enter the account holder name");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          bank_name: bankName,
          bank_account_number: accountNumber,
          bank_account_name: accountName,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Bank details saved successfully!");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSaved?.();
    } catch (error: any) {
      console.error("Error saving bank details:", error);
      toast.error(error.message || "Failed to save bank details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-primary" />
        Bank Account Details
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Add your bank account to receive your referral earnings
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Bank Name</label>
          <select
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full h-12 px-4 rounded-lg bg-background border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          >
            <option value="">Select your bank</option>
            {NIGERIAN_BANKS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </div>

        <FloatingInput
          label="Account Number"
          icon={<CreditCard className="w-5 h-5" />}
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit account number"
          required
        />

        <FloatingInput
          label="Account Holder Name"
          icon={<User className="w-5 h-5" />}
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="Name on the account"
          required
        />

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved!
            </>
          ) : (
            "Save Bank Details"
          )}
        </Button>
      </div>
    </Card>
  );
};

export default BankDetailsForm;