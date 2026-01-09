import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ZoomIn, ZoomOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PaymentProofViewerProps {
  documentId: string;
  onClose: () => void;
}

const PaymentProofViewer = ({ documentId, onClose }: PaymentProofViewerProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [documentInfo, setDocumentInfo] = useState<any>(null);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      // Get document info
      const { data: doc, error: docError } = await supabase
        .from("document_uploads")
        .select("*")
        .eq("id", documentId)
        .single();

      if (docError) throw docError;
      setDocumentInfo(doc);

      // Get signed URL for the image
      const { data: urlData, error: urlError } = await supabase
        .storage
        .from("payment-screenshots")
        .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

      if (urlError) throw urlError;
      setImageUrl(urlData.signedUrl);
    } catch (error) {
      console.error("Error loading document:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (imageUrl) {
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h3 className="font-bold text-foreground">Payment Screenshot</h3>
              {documentInfo && (
                <p className="text-sm text-muted-foreground">
                  {documentInfo.file_name} • {new Date(documentInfo.created_at).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={handleDownload}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Image Container */}
          <div className="overflow-auto p-4 max-h-[calc(90vh-80px)] bg-background/50">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : imageUrl ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <img
                  src={imageUrl}
                  alt="Payment screenshot"
                  style={{ transform: `scale(${zoom})` }}
                  className="max-w-full h-auto transition-transform duration-200 rounded-lg shadow-lg"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Failed to load image
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentProofViewer;
