import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Send } from "lucide-react";

const WithdrawalsApproval = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const load = async () => {
    let q = supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const decide = async (id: string, status: "approved" | "rejected" | "paid") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("withdrawals").update({
      status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Withdrawal ${status}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Withdrawals</h2>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pending</Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No withdrawals.</Card>
      ) : items.map((w) => (
        <Card key={w.id} className="p-4 bg-card/50 border-border/50">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex-1 min-w-[200px]">
              <div className="font-semibold text-lg">${Number(w.amount_usd).toFixed(2)}</div>
              <div className="text-xs font-mono text-muted-foreground truncate max-w-md">→ {w.wallet_address}</div>
              <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()} · user {w.user_id.slice(0, 8)}</div>
            </div>
            <Badge>{w.status}</Badge>
            <div className="flex gap-2 flex-wrap">
              {w.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => decide(w.id, "approved")}><Check className="w-4 h-4 mr-1" />Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(w.id, "rejected")}><X className="w-4 h-4" /></Button>
                </>
              )}
              {w.status === "approved" && (
                <Button size="sm" onClick={() => decide(w.id, "paid")}><Send className="w-4 h-4 mr-1" />Mark Paid</Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default WithdrawalsApproval;
