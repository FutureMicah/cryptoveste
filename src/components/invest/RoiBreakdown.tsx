import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Clock, DollarSign, Zap } from "lucide-react";
import EmptyState, { ListSkeleton } from "@/components/EmptyState";
import { Progress } from "@/components/ui/progress";

interface Inv {
  id: string;
  amount: number;
  expected_return: number;
  total_paid: number;
  starts_at: string;
  ends_at: string;
  status: string;
  investment_plans: { name: string; roi_percent: number; duration_days: number } | null;
}

const computeDueNow = (inv: Inv) => {
  const total = new Date(inv.ends_at).getTime() - new Date(inv.starts_at).getTime();
  const elapsed = Math.min(Math.max(Date.now() - new Date(inv.starts_at).getTime(), 0), total);
  const target = inv.expected_return * (elapsed / Math.max(total, 1));
  return Math.max(target - inv.total_paid, 0);
};

const RoiBreakdown = ({ userId, limit }: { userId: string; limit?: number }) => {
  const [items, setItems] = useState<Inv[] | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const load = async () => {
      let q = supabase.from("user_investments")
        .select("id, amount, expected_return, total_paid, starts_at, ends_at, status, investment_plans(name, roi_percent, duration_days)")
        .eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data } = await q;
      setItems((data as any) ?? []);
    };
    load();
    const ch = supabase.channel(`roi-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_investments", filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    const tick = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => { supabase.removeChannel(ch); clearInterval(tick); };
  }, [userId, limit]);

  if (items === null) return <ListSkeleton rows={2} />;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No active investments"
        description="Pick a plan to start earning ROI."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((inv) => {
        const due = computeDueNow(inv);
        const progress = Math.min((inv.total_paid / inv.expected_return) * 100, 100);
        const remainingDays = Math.max(0, Math.ceil((new Date(inv.ends_at).getTime() - Date.now()) / 86400000));
        return (
          <div key={inv.id} className="rounded-3xl bg-card border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold">{inv.investment_plans?.name ?? "Plan"}</p>
                <p className="text-[11px] text-muted-foreground">
                  ${Number(inv.amount).toFixed(2)} · {inv.investment_plans?.roi_percent}% / {inv.investment_plans?.duration_days}d
                </p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-primary/15 text-primary font-semibold uppercase">Active</span>
            </div>

            <Progress value={progress} className="h-1.5" />

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted/40 p-2">
                <DollarSign className="w-3 h-3 mx-auto text-muted-foreground" />
                <p className="text-[9px] uppercase text-muted-foreground mt-0.5">Accrued</p>
                <p className="text-xs font-bold">${Number(inv.total_paid).toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-primary/15 text-primary p-2">
                <Zap className="w-3 h-3 mx-auto" />
                <p className="text-[9px] uppercase mt-0.5">Due now</p>
                <p className="text-xs font-bold">${due.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-2">
                <Clock className="w-3 h-3 mx-auto text-muted-foreground" />
                <p className="text-[9px] uppercase text-muted-foreground mt-0.5">Left</p>
                <p className="text-xs font-bold">{remainingDays}d</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RoiBreakdown;
