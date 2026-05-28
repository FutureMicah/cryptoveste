import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import shieldImg from "@/assets/lime-shield.jpeg";

interface Props { userId: string }

const KycStatusBanner = ({ userId }: Props) => {
  const [kyc, setKyc] = useState<{ status: string; rejection_reason?: string | null } | null | undefined>(undefined);
  const prevStatus = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("user_kyc").select("status, rejection_reason").eq("user_id", userId).maybeSingle();
      if (!active) return;
      // Notify only on real transitions (not first load)
      if (prevStatus.current !== undefined && data?.status && data.status !== prevStatus.current) {
        if (data.status === "approved") {
          toast.success("KYC approved 🎉", { description: "You can now withdraw funds." });
        } else if (data.status === "rejected") {
          toast.error("KYC rejected", { description: data.rejection_reason || "Please review and resubmit." });
        } else if (data.status === "pending") {
          toast.info("KYC under review", { description: "We'll notify you once it's processed." });
        }
      }
      prevStatus.current = data?.status ?? null;
      setKyc(data ?? null);
    };
    load();
    const ch = supabase
      .channel(`kyc-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_kyc", filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [userId]);

  if (kyc === undefined) return null;

  // Approved → small celebratory ribbon that auto-dismisses (rendered once via toast above, no banner)
  if (kyc?.status === "approved") return null;

  const base = "rounded-2xl p-3 flex items-center gap-2.5 border animate-fade-in shadow-lg";

  if (!kyc) return (
    <Link to="/kyc" className={`${base} bg-card border-border hover:border-primary/50 transition-colors group`}>
      <div className="relative w-10 h-10 shrink-0">
        <img src={shieldImg} alt="" className="w-10 h-10 object-contain rounded-xl animate-float" />
        <div className="absolute inset-0 rounded-xl bg-primary/0 group-hover:bg-primary/10 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">Verify your identity</p>
        <p className="text-[10px] text-muted-foreground truncate">Required to withdraw funds.</p>
      </div>
      <span className="text-[10px] text-primary font-semibold shrink-0">Start ›</span>
    </Link>
  );
  if (kyc.status === "pending") return (
    <Link to="/kyc" className={`${base} bg-yellow-500/10 border-yellow-500/40`}>
      <Loader2 className="w-4 h-4 text-yellow-500 shrink-0 animate-spin" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">KYC under review</p>
        <p className="text-[10px] text-muted-foreground truncate">We'll notify you once approved.</p>
      </div>
    </Link>
  );
  if (kyc.status === "rejected") return (
    <Link to="/kyc" className={`${base} bg-destructive/10 border-destructive/40`}>
      <AlertCircle className="w-4 h-4 text-destructive shrink-0 animate-glow-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">KYC rejected</p>
        <p className="text-[10px] text-muted-foreground truncate">{kyc.rejection_reason || "Please resubmit."}</p>
      </div>
      <span className="text-[10px] text-destructive font-semibold shrink-0">Fix ›</span>
    </Link>
  );
  return null;
};

export default KycStatusBanner;
