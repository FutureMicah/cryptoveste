import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, X, ShieldCheck, Eye, Inbox } from "lucide-react";
import EmptyState, { ListSkeleton } from "@/components/EmptyState";
import { logAdminAction } from "@/lib/auditLog";

const KycApproval = () => {
  const [items, setItems] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = async () => {
    setItems(null);
    let q = supabase.from("user_kyc").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const view = async (path: string) => {
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const decide = async (k: any, status: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    const update: any = { status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() };
    if (status === "rejected") update.rejection_reason = reasons[k.id] || "Not specified";
    const { error } = await supabase.from("user_kyc").update(update).eq("id", k.id);
    if (error) return toast.error(error.message);
    await logAdminAction(`kyc_${status}`, { targetType: "user_kyc", targetId: k.id, targetUserId: k.user_id, details: { full_name: k.full_name, reason: update.rejection_reason } });
    toast.success(`KYC ${status}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h2 className="text-xl font-semibold">KYC Reviews</h2>
        <div className="flex gap-1.5 flex-wrap">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize rounded-full h-8">{f}</Button>
          ))}
        </div>
      </div>

      {items === null ? <ListSkeleton rows={3} /> : items.length === 0 ? (
        <EmptyState icon={Inbox} title="Nothing to review" description="KYC submissions will show up here." />
      ) : items.map((k) => (
        <Card key={k.id} className="p-4 bg-card border-border rounded-2xl space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />{k.full_name}</p>
              <p className="text-[11px] text-muted-foreground">{k.id_type} · {k.id_number} · {k.country || "—"}</p>
              <p className="text-[10px] text-muted-foreground">user {k.user_id.slice(0, 8)} · {new Date(k.created_at).toLocaleString()}</p>
            </div>
            <Badge>{k.status}</Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            {k.id_front_url && <Button size="sm" variant="outline" onClick={() => view(k.id_front_url)}><Eye className="w-3.5 h-3.5 mr-1" />Front</Button>}
            {k.id_back_url && <Button size="sm" variant="outline" onClick={() => view(k.id_back_url)}><Eye className="w-3.5 h-3.5 mr-1" />Back</Button>}
            {k.selfie_url && <Button size="sm" variant="outline" onClick={() => view(k.selfie_url)}><Eye className="w-3.5 h-3.5 mr-1" />Selfie</Button>}
          </div>
          {k.status === "pending" && (
            <div className="flex gap-2 flex-wrap pt-1">
              <Input placeholder="Rejection reason (if rejecting)" className="flex-1 min-w-[180px] rounded-xl h-9 text-xs" value={reasons[k.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [k.id]: e.target.value })} />
              <Button size="sm" onClick={() => decide(k, "approved")} className="gradient-lime border-0 text-primary-foreground"><Check className="w-4 h-4" /></Button>
              <Button size="sm" variant="destructive" onClick={() => decide(k, "rejected")}><X className="w-4 h-4" /></Button>
            </div>
          )}
          {k.status === "rejected" && k.rejection_reason && (
            <p className="text-[11px] text-destructive">Reason: {k.rejection_reason}</p>
          )}
        </Card>
      ))}
    </div>
  );
};

export default KycApproval;
