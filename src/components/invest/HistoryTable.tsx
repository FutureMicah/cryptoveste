import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fmtDate = (d: string) => new Date(d).toLocaleString();
const badge = (s: string) => {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    paid: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
  };
  return map[s] ?? "bg-muted text-muted-foreground";
};

const HistoryTable = ({ userId }: { userId: string }) => {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [d, w] = await Promise.all([
        supabase.from("deposits").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);
      setDeposits(d.data ?? []);
      setWithdrawals(w.data ?? []);
    };
    load();
    const ch = supabase.channel(`hist-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${userId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals", filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5 bg-card/50 border-border/50">
        <h3 className="font-semibold mb-3">Deposits</h3>
        {deposits.length === 0 ? <p className="text-sm text-muted-foreground">No deposits yet.</p> : (
          <div className="space-y-2">
            {deposits.map((d) => (
              <div key={d.id} className="flex justify-between items-center text-sm py-2 border-b border-border/30 last:border-0">
                <div>
                  <div className="font-medium">${Number(d.amount_usd).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(d.created_at)}</div>
                </div>
                <Badge className={badge(d.status)}>{d.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 bg-card/50 border-border/50">
        <h3 className="font-semibold mb-3">Withdrawals</h3>
        {withdrawals.length === 0 ? <p className="text-sm text-muted-foreground">No withdrawals yet.</p> : (
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex justify-between items-center text-sm py-2 border-b border-border/30 last:border-0">
                <div>
                  <div className="font-medium">${Number(w.amount_usd).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(w.created_at)}</div>
                </div>
                <Badge className={badge(w.status)}>{w.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default HistoryTable;
