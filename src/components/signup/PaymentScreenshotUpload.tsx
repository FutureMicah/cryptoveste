import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle, AlertCircle, Image as ImageIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FloatingInput from "../FloatingInput";

interface PaymentScreenshotUploadProps {
  paymentId?: string;
  userId?: string;
  expectedAmount?: number;
  currency?: string;
  onVerified?: () => void;
  userFullName: string;
}

export const PaymentScreenshotUpload = ({
  paymentId,
  userId,
  expectedAmount,
  currency = "NGN",
  onVerified,
  userFullName,
}: PaymentScreenshotUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [uploadComplete, setUploadComplete] = useState(false);
  const [paymentAccountName, setPaymentAccountName] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate payment account name first
    if (!paymentAccountName.trim()) {
      toast.error("Please enter the name on your payment account first");
      return;
    }

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PNG, JPG, or PDF.");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setFileName(file.name);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Upload file
    setUploading(true);
    try {
      const user = await supabase.auth.getUser();
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.data.user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      // Upload to Supabase Storage (you'll need to create this bucket)
      const { error: uploadError, data } = await supabase.storage
        .from("payment-screenshots")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Record document upload
      const { data: docData, error: docError } = await supabase
        .from("document_uploads")
        .insert({
          user_id: userId || user.data.user?.id,
          doc_type: "payment_screenshot",
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          status: "uploaded",
        })
        .select()
        .single();

      if (docError) throw docError;

      // Name verification - normalize for comparison
      const normalizeString = (str: string) => 
        str.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
      
      const userNameNormalized = normalizeString(userFullName);
      const paymentNameNormalized = normalizeString(paymentAccountName);
      
      const nameMatch = userNameNormalized === paymentNameNormalized;

      // Create payment proof record with name verification
      const { error: proofError } = await supabase
        .from("payment_proofs")
        .insert({
          user_id: userId || user.data.user?.id,
          payment_id: paymentId,
          document_id: docData.id,
          amount: expectedAmount,
          currency: currency,
          status: "submitted",
          payment_account_name: paymentAccountName,
          name_verification_status: nameMatch ? "verified" : "failed",
        });

      if (proofError) throw proofError;

      if (!nameMatch) {
        toast.warning("Name mismatch detected - payment will require manual admin verification", {
          duration: 5000,
        });
      }

      setUploadComplete(true);
      toast.success("Screenshot uploaded! Verification in progress...");

      // Check for auto-verification after a short delay
      setTimeout(async () => {
        const { data: proofData } = await supabase
          .from("payment_proofs")
          .select("status")
          .eq("document_id", docData.id)
          .single();

        if (proofData?.status === "auto_verified") {
          playVerificationSound();
          toast.success("✓ Payment Verified!", {
            description: "Your payment has been confirmed automatically.",
          });
          onVerified?.();
        }
      }, 2000);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload screenshot");
    } finally {
      setUploading(false);
    }
  };

  const playVerificationSound = () => {
    // Play a pleasant chime sound
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjJ+zPDTgjMGHm/A7OWhUBELTKXh8bllHAU2jdXvzn0pBSh1yO/ajDwHGWe56+OgTxALTqXi77djHQU0jNXu0IAqBSh0x+7Zh0EMGWe66+KiUBELTaXi77djHAU1jNXvz4AqBSh0yO/Yh0MMGGe66+OiUBELTaXi77djHAU1jNXu0H8qBSh0yO/Xh0MNGGe66+OiUBELTaXi77ZjHAU1jNXv0H8qBShzx+7YiEQLF2a56+SjURELTKPh77ZjHQU1i9Tu0H8rBCh0x+7Yh0QLF2a56+SjURELTKPh77ZjHQU1i9Tv0H8rBCh0x+7Yh0QLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7Zh0QLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7Zh0QLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURH=");
    audio.play().catch(() => console.log("Could not play sound"));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 bg-card/30 p-6">
        <div className="mb-4 flex items-start gap-3">
          <AlertCircle className="mt-1 h-5 w-5 text-primary" />
          <div className="text-sm space-y-2">
            <p className="font-medium text-foreground">
              Important: Upload Payment Screenshot
            </p>
            <p className="text-muted-foreground">
              All payments must include a screenshot showing: transaction date, amount,
              recipient (BlackPAL/BlackTrader Academy), and transaction ID/reference.
            </p>
            <p className="text-muted-foreground font-medium mt-2">
              ⚠️ The account name must match your signup name: <strong>{userFullName}</strong>
            </p>
          </div>
        </div>

        {/* Payment Account Name Field */}
        <div className="mb-4">
          <FloatingInput
            label="Name on Payment Account"
            icon={<User className="w-5 h-5" />}
            value={paymentAccountName}
            onChange={(e) => setPaymentAccountName(e.target.value)}
            required
            placeholder="Enter the exact name on your payment account"
            disabled={uploading || uploadComplete}
          />
        </div>

        <div className="space-y-4">
          {!preview && !uploadComplete && (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-background/50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, or PDF (MAX. 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          )}

          {preview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-lg overflow-hidden border border-border"
            >
              <img src={preview} alt="Payment screenshot" className="w-full h-auto" />
              {uploadComplete && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center"
                >
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
                    <p className="text-white font-medium">Screenshot Uploaded</p>
                    <p className="text-white/70 text-sm">Verifying payment...</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {fileName && !preview && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="w-4 h-4" />
              <span>{fileName}</span>
            </div>
          )}
        </div>

        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center"
          >
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
          </motion.div>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>✓ Clear image showing full transaction details</p>
        <p>✓ Date visible and within last 48 hours</p>
        <p>✓ Amount matches your selected plan</p>
        <p>✓ Transaction ID/reference clearly visible</p>
      </div>
    </div>
  );
};
