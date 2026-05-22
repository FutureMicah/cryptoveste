import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Investment {
  id: string;
  amount: number;
  expected_return: number;
  total_paid: number;
  status: string;
  starts_at: string;
  ends_at: string;
  investment_plans: { name: string; roi_percent: number };
}

const statusColor = (s: string) => s === "active" ? "bg-green-500/20 text-green-400" : s === "completed" ? "bg-blue-500/20 text-blue-400" : "bg-muted text-muted-foreground";

const ActiveInvestments = ({ userId }: { userId: string }) => {
  const [items, setItems] = useState<Investment[]>([]);

  useEffect(() => {
    const load = () => supabase
      .from("user_investments")
      .select("*, investment_plans(name, roi_percent)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as any) ?? []));
    load();
    const ch = supabase.channel(`inv-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_investments", filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  if (!items.length) return (
    <Card className="p-8 bg-card/50 border-border/50 text-center text-muted-foreground">
      No investments yet. Pick a plan to get started.
    </Card>
  );

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {items.map((inv) => {
        const pct = Math.min(100, (inv.total_paid / inv.expected_return) * 100);
        const daysLeft = Math.max(0, Math.ceil((new Date(inv.ends_at).getTime() - Date.now()) / 86400000));
        return (
          <Card key={inv.id} className="p-5 bg-card/50 border-border/50">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold">{inv.investment_plans?.name}</h4>
                <p className="text-xs text-muted-foreground">
                  ${inv.amount} → ${inv.expected_return.toFixed(2)}
                </p>
              </div>
              <Badge className={statusColor(inv.status)}>{inv.status}</Badge>
            </div>
            <Progress value={pct} className="h-2 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paid: ${inv.total_paid.toFixed(2)}</span>
              <span>{daysLeft}d left</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default ActiveInvestments;
