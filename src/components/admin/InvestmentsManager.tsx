import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { DollarSign, Zap, Loader2 } from "lucide-react";

const InvestmentsManager = () => {
  const [items, setItems] = useState<any[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [distributing, setDistributing] = useState(false);

  const load = async () => {
    let q = supabase.from("user_investments")
      .select("*, investment_plans(name, roi_percent, duration_days)")
      .order("created_at", { ascending: false });
    if (filter === "active") q = q.eq("status", "active");
    const { data } = await q;
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const distribute = async () => {
    setDistributing(true);
    const { data, error } = await supabase.rpc("distribute_due_roi");
    setDistributing(false);
    if (error) return toast.error(error.message);
    const count = (data as any[])?.length ?? 0;
    const total = ((data as any[]) ?? []).reduce((s, r) => s + Number(r.credited), 0);
    toast.success(count > 0 ? `Credited $${total.toFixed(2)} across ${count} investments` : "Nothing due yet");
    load();
  };

  const credit = async (id: string) => {
    const amt = parseFloat(amounts[id] ?? "");
    if (!amt || amt <= 0) return toast.error("Enter ROI amount");
    const { error } = await supabase.rpc("credit_investment_roi", { _investment_id: id, _amount: amt });
    if (error) return toast.error(error.message);
    toast.success(`Credited $${amt} ROI`);
    setAmounts((s) => ({ ...s, [id]: "" }));
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Investments</h2>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={filter === "active" ? "default" : "outline"} onClick={() => setFilter("active")}>Active</Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
          <Button size="sm" onClick={distribute} disabled={distributing} className="gradient-lime border-0 text-primary-foreground">
            {distributing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
            Distribute due ROI
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground rounded-2xl">No investments.</Card>
      ) : items.map((inv) => {
        const elapsed = (Date.now() - +new Date(inv.starts_at)) / (+new Date(inv.ends_at) - +new Date(inv.starts_at));
        const target = Math.min(1, Math.max(0, elapsed)) * Number(inv.expected_return);
        const pending = Math.max(0, target - Number(inv.total_paid));
        const pct = Math.min(100, (inv.total_paid / inv.expected_return) * 100);
        return (
          <Card key={inv.id} className="p-4 bg-card border-border rounded-2xl">
            <div className="flex flex-wrap justify-between gap-3 mb-3">
              <div>
                <div className="font-semibold">{inv.investment_plans?.name} · ${Number(inv.amount).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">
                  {inv.investment_plans?.roi_percent}% / {inv.investment_plans?.duration_days}d · expects ${Number(inv.expected_return).toFixed(2)}
                </div>
              </div>
              <Badge>{inv.status}</Badge>
            </div>
            <Progress value={pct} className="h-2 mb-2" />
            <div className="text-xs text-muted-foreground mb-3 flex justify-between">
              <span>Paid ${Number(inv.total_paid).toFixed(2)} / ${Number(inv.expected_return).toFixed(2)}</span>
              <span className={pending > 0 ? "text-primary font-semibold" : ""}>Due now: ${pending.toFixed(2)}</span>
            </div>
            {inv.status === "active" && (
              <div className="flex gap-2 flex-wrap">
                <Input type="number" placeholder="Manual ROI $" value={amounts[inv.id] ?? ""}
                  onChange={(e) => setAmounts({ ...amounts, [inv.id]: e.target.value })} className="max-w-[160px] rounded-xl" />
                <Button size="sm" onClick={() => credit(inv.id)} variant="outline">
                  <DollarSign className="w-4 h-4 mr-1" />Credit
                </Button>
                <Button size="sm" variant="destructive" onClick={async () => {
                  if (!confirm("Cancel and refund remaining principal?")) return;
                  const { error } = await supabase.rpc("admin_cancel_investment", { _investment_id: inv.id });
                  if (error) return toast.error(error.message);
                  toast.success("Cancelled"); load();
                }}>Cancel</Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default InvestmentsManager;
