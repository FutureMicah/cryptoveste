import { useEffect, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { supabase } from "@/integrations/supabase/client";
import { X, ZoomIn, ZoomOut, Download, RotateCw, Loader2, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProofViewerProps {
  path: string | null;
  onClose: () => void;
  bucket?: string;
  title?: string;
}

const ProofViewer = ({ path, onClose, bucket = "payment-screenshots", title = "Payment proof" }: ProofViewerProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const surface = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!path) return;
    let active = true;
    setUrl(null); setError(false); setZoom(1); setRot(0); setNatural({ width: 0, height: 0 });
    supabase.storage.from(bucket).createSignedUrl(path, 3600)
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setUrl(data?.signedUrl ?? null);
        setError(Boolean(loadError) || !data?.signedUrl);
      }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [path, bucket]);

  useEffect(() => {
    if (!path) return;
    const el = surface.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      observer.disconnect();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [path, onClose]);

  if (!path) return null;

  const sideways = rot % 180 !== 0;
  const fit = natural.width && natural.height
    ? Math.min((viewport.width - 32) / (sideways ? natural.height : natural.width), (viewport.height - 32) / (sideways ? natural.width : natural.height), 1)
    : 1;
  const width = Math.max(0, natural.width * fit);
  const height = Math.max(0, natural.height * fit);

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = path.split("/").pop() ?? "proof.png";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a); a.click(); a.remove();
  };

  const controlClass = "h-9 w-9 shrink-0 text-foreground hover:bg-muted";

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur-sm">
      <TransformWrapper key={`${path}-${rot}`} initialScale={1} minScale={0.75} maxScale={2} centerOnInit centerZoomedOut smooth wheel={{ step: 0.0015 }} doubleClick={{ disabled: true }} onTransform={(_, state) => setZoom(state.scale)}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-border p-2 sm:p-3">
              <p className="min-w-0 flex-1 truncate px-1 text-xs font-semibold sm:text-sm">{title}</p>
              <Button size="icon" variant="ghost" className={controlClass} aria-label="Close document" title="Close" onClick={onClose}><X className="h-5 w-5" /></Button>
              <div className="flex w-full items-center justify-center gap-1 sm:w-auto sm:justify-end">
                <Button size="icon" variant="ghost" className={controlClass} aria-label="Zoom out" title="Zoom out" disabled={!url || error || zoom <= 0.75} onClick={() => zoomOut(0.1, 150)}><ZoomOut className="h-4 w-4" /></Button>
                <span className="w-10 shrink-0 text-center text-xs tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
                <Button size="icon" variant="ghost" className={controlClass} aria-label="Zoom in" title="Zoom in" disabled={!url || error || zoom >= 2} onClick={() => zoomIn(0.1, 150)}><ZoomIn className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className={controlClass} aria-label="Fit document" title="Fit document" onClick={() => resetTransform(150)} disabled={!url || error}><Maximize className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className={controlClass} aria-label="Rotate document" title="Rotate" onClick={() => { setRot((r) => (r + 90) % 360); setZoom(1); }} disabled={!url || error}><RotateCw className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className={controlClass} aria-label="Download original" title="Download original" onClick={download} disabled={!url || error}><Download className="h-4 w-4" /></Button>
              </div>
            </div>
            <div ref={surface} className="relative min-h-0 flex-1 overflow-hidden">
              {error ? <p role="alert" className="grid h-full place-items-center p-4 text-sm text-muted-foreground">Could not load this document. Close and try again.</p> : !url ? <div className="grid h-full place-items-center"><Loader2 aria-label="Loading document" className="h-8 w-8 animate-spin text-primary" /></div> : (
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%", touchAction: "none" }}>
                  <div className="relative select-none" style={{ width: sideways ? height : width, height: sideways ? width : height }}>
                    <img src={url} alt={title} draggable={false} onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} onError={() => setError(true)} className="absolute left-1/2 top-1/2 max-w-none" style={{ width: width || undefined, height: height || undefined, transform: `translate(-50%, -50%) rotate(${rot}deg)` }} />
                  </div>
                </TransformComponent>
              )}
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

export default ProofViewer;