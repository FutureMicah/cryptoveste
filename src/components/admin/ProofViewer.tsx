import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, ZoomIn, ZoomOut, Download, RotateCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProofViewerProps {
  path: string | null;
  onClose: () => void;
}

const ProofViewer = ({ path, onClose }: ProofViewerProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);

  useEffect(() => {
    if (!path) return;
    setUrl(null); setZoom(1); setRot(0);
    supabase.storage.from("payment-screenshots").createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);

  if (!path) return null;

  const download = async () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = path.split("/").pop() ?? "proof.png";
    a.target = "_blank";
    document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10" onClick={(e) => e.stopPropagation()}>
        <p className="text-white text-sm font-semibold truncate">Payment proof</p>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 h-9 w-9" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-white text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 h-9 w-9" onClick={() => setZoom((z) => Math.min(5, z + 0.25))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 h-9 w-9" onClick={() => setRot((r) => (r + 90) % 360)}>
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 h-9 w-9" onClick={download} disabled={!url}>
            <Download className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 h-9 w-9" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto grid place-items-center p-4" onClick={(e) => e.stopPropagation()}>
        {!url ? (
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : (
          <img
            src={url}
            alt="Payment proof"
            className="max-w-none transition-transform select-none"
            style={{ transform: `scale(${zoom}) rotate(${rot}deg)`, transformOrigin: "center" }}
            draggable={false}
          />
        )}
      </div>
    </div>
  );
};

export default ProofViewer;
