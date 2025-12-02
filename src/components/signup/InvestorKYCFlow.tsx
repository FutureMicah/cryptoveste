import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvestorKYCFlowProps {
  onComplete: () => void;
}

const REQUIRED_DOCUMENTS = [
  { type: "government_id", label: "Government Issued ID", description: "Passport, Driver's License, or National ID" },
  { type: "proof_of_address", label: "Proof of Address", description: "Utility bill or bank statement (max 3 months old)" },
  { type: "bank_statement", label: "Bank Statement", description: "Last 3 months bank statement" },
  { type: "source_of_funds", label: "Source of Funds", description: "Documentation proving source of investment capital" },
];

const InvestorKYCFlow = ({ onComplete }: InvestorKYCFlowProps) => {
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [schedulingInterview, setSchedulingInterview] = useState(false);

  const handleFileUpload = async (docType: string, file: File) => {
    setUploading(docType);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.data.user.id}-${docType}-${Date.now()}.${fileExt}`;
      const filePath = `kyc-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots") // Reuse existing bucket or create new one
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Record document upload
      const { data: docData, error: docError } = await supabase
        .from("document_uploads")
        .insert({
          user_id: user.data.user.id,
          doc_type: `kyc_${docType}`,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          status: "uploaded",
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create KYC document record
      const { error: kycError } = await supabase
        .from("investor_kyc_documents")
        .insert({
          user_id: user.data.user.id,
          document_type: docType,
          document_id: docData.id,
          status: "pending",
        });

      if (kycError) throw kycError;

      setUploadedDocs(prev => ({
        ...prev,
        [docType]: { file: file.name, uploaded: true }
      }));

      toast.success(`${docType.replace(/_/g, " ")} uploaded successfully`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload document");
    } finally {
      setUploading(null);
    }
  };

  const requestInterview = async () => {
    setSchedulingInterview(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Not authenticated");

      // Create interview request (admin will schedule)
      const { error } = await supabase
        .from("admin_interviews")
        .insert({
          user_id: user.data.user.id,
          scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Placeholder: 7 days from now
          status: "scheduled",
          notes: "Interview request pending admin scheduling",
        });

      if (error) throw error;

      toast.success("Interview request submitted!", {
        description: "An admin will contact you to schedule your compliance interview.",
      });

      onComplete();
    } catch (error: any) {
      console.error("Interview request error:", error);
      toast.error(error.message || "Failed to request interview");
    } finally {
      setSchedulingInterview(false);
    }
  };

  const allDocsUploaded = REQUIRED_DOCUMENTS.every(doc => uploadedDocs[doc.type]?.uploaded);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto px-4"
    >
      <div className="glass-card rounded-3xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Investor KYC Verification
          </h1>
          <p className="text-muted-foreground">
            Upload required documents for compliance verification
          </p>
        </div>

        {/* Document Upload List */}
        <div className="space-y-4 mb-8">
          {REQUIRED_DOCUMENTS.map((doc, index) => (
            <motion.div
              key={doc.type}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border-2 rounded-xl p-6 transition-colors ${
                uploadedDocs[doc.type]?.uploaded
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-border/50 hover:border-primary/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {uploadedDocs[doc.type]?.uploaded ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    )}
                    <h3 className="font-bold text-foreground">{doc.label}</h3>
                    {doc.type === "government_id" || doc.type === "proof_of_address" ? (
                      <span className="text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-1 rounded">
                        Required
                      </span>
                    ) : (
                      <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{doc.description}</p>
                  {uploadedDocs[doc.type]?.uploaded && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      ✓ {uploadedDocs[doc.type].file}
                    </p>
                  )}
                </div>

                <div>
                  {!uploadedDocs[doc.type]?.uploaded && (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(doc.type, file);
                        }}
                        disabled={uploading === doc.type}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={uploading === doc.type}
                        asChild
                      >
                        <span>
                          {uploading === doc.type ? (
                            "Uploading..."
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Compliance Notice */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
            <div className="text-sm space-y-2">
              <p className="font-medium text-foreground">Compliance Interview Required</p>
              <p className="text-muted-foreground">
                After uploading your documents, you'll need to complete a brief video interview with our compliance team. This typically takes 15-30 minutes and can be scheduled at your convenience.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={requestInterview}
          disabled={!allDocsUploaded || schedulingInterview}
          className="w-full h-14 text-lg font-semibold"
        >
          {schedulingInterview
            ? "Requesting Interview..."
            : allDocsUploaded
            ? "Request Compliance Interview →"
            : "Upload All Required Documents First"}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-4">
          🔒 All documents are encrypted and stored securely. Your information is protected under data privacy regulations.
        </p>
      </div>
    </motion.div>
  );
};

export default InvestorKYCFlow;
