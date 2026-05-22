import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

const InvestmentsManager = () => {
  const [items, setItems] = useState<any[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"active" | "all">("active");

  const load = async () => {
    let q = supabase.from("user_investments").select("*, investment_plans(name, roi_percent)").order("created_at", { ascending: false });
    if (filter === "active") q = q.eq("status", "active");
    const { data } = await q;
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);

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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Investments</h2>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "active" ? "default" : "outline"} onClick={() => setFilter("active")}>Active</Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No investments.</Card>
      ) : items.map((inv) => {
        const pct = Math.min(100, (inv.total_paid / inv.expected_return) * 100);
        return (
          <Card key={inv.id} className="p-4 bg-card/50 border-border/50">
            <div className="flex flex-wrap justify-between gap-3 mb-3">
              <div>
                <div className="font-semibold">{inv.investment_plans?.name} · ${inv.amount}</div>
                <div className="text-xs text-muted-foreground">user {inv.user_id.slice(0, 8)} · expects ${inv.expected_return.toFixed(2)}</div>
              </div>
              <Badge>{inv.status}</Badge>
            </div>
            <Progress value={pct} className="h-2 mb-2" />
            <div className="text-xs text-muted-foreground mb-3">Paid ${inv.total_paid.toFixed(2)} / ${inv.expected_return.toFixed(2)}</div>
            {inv.status === "active" && (
              <div className="flex gap-2">
                <Input type="number" placeholder="ROI amount $" value={amounts[inv.id] ?? ""} onChange={(e) => setAmounts({ ...amounts, [inv.id]: e.target.value })} className="max-w-[180px]" />
                <Button size="sm" onClick={() => credit(inv.id)}><DollarSign className="w-4 h-4 mr-1" />Credit ROI</Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default InvestmentsManager;
