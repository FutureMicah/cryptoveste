import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, Check, X } from "lucide-react";

interface Deposit {
  id: string;
  user_id: string;
  amount_usd: number;
  tx_hash: string;
  sender_wallet: string | null;
  screenshot_url: string | null;
  status: string;
  created_at: string;
}

const DepositsApproval = () => {
  const [items, setItems] = useState<Deposit[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const load = async () => {
    let q = supabase.from("deposits").select("*").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    setItems((data as Deposit[]) ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const viewScreenshot = async (path: string, id: string) => {
    if (signedUrls[id]) { window.open(signedUrls[id], "_blank"); return; }
    const { data } = await supabase.storage.from("payment-screenshots").createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      setSignedUrls((s) => ({ ...s, [id]: data.signedUrl }));
      window.open(data.signedUrl, "_blank");
    }
  };

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("deposits").update({
      status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Deposit ${status}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Deposits</h2>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pending</Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No deposits.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <Card key={d.id} className="p-4 bg-card/50 border-border/50">
              <div className="flex flex-wrap items-center gap-4 justify-between">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-lg">${Number(d.amount_usd).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate max-w-md">tx: {d.tx_hash}</div>
                  <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()} · user {d.user_id.slice(0, 8)}</div>
                </div>
                <Badge>{d.status}</Badge>
                <div className="flex gap-2">
                  {d.screenshot_url && (
                    <Button size="sm" variant="outline" onClick={() => viewScreenshot(d.screenshot_url!, d.id)}>
                      <Eye className="w-4 h-4 mr-1" /> Proof
                    </Button>
                  )}
                  {d.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => decide(d.id, "approved")}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(d.id, "rejected")}><X className="w-4 h-4" /></Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepositsApproval;
