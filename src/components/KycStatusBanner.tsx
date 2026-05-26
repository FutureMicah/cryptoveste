import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

interface Props { userId: string }

const KycStatusBanner = ({ userId }: Props) => {
  const [kyc, setKyc] = useState<{ status: string; rejection_reason?: string | null } | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("user_kyc").select("status, rejection_reason").eq("user_id", userId).maybeSingle();
      if (active) setKyc(data ?? null);
    };
    load();
    const ch = supabase
      .channel(`kyc-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_kyc", filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [userId]);

  if (kyc === undefined) return null;
  if (kyc?.status === "approved") return null;

  const base = "rounded-2xl p-3 flex items-center gap-2.5 border";
  if (!kyc) return (
    <Link to="/kyc" className={`${base} bg-card border-border`}>
      <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
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
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
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
