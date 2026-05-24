import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, TrendingUp, Check, PackageOpen } from "lucide-react";
import EmptyState, { CardSkeleton } from "@/components/EmptyState";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  min_amount: number;
  max_amount: number;
  roi_percent: number;
  duration_days: number;
}

const InvestPanel = ({ userId, balance, onDone }: { userId: string; balance: number; onDone?: () => void }) => {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("investment_plans").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

  const invest = async () => {
    if (!selected) return toast.error("Select a plan");
    const amt = parseFloat(amount);
    if (!amt || amt < selected.min_amount || amt > selected.max_amount) {
      return toast.error(`Amount must be $${selected.min_amount} – $${selected.max_amount}`);
    }
    if (amt > balance) return toast.error("Insufficient balance. Deposit first.");

    setLoading(true);
    const { error } = await supabase.from("user_investments").insert({
      user_id: userId, plan_id: selected.id, amount: amt, expected_return: 0, ends_at: new Date().toISOString(),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`${selected.name} plan started!`);
    setSelected(null); setAmount("");
    onDone?.();
  };

  const profit = selected && amount ? (parseFloat(amount) * selected.roi_percent) / 100 : 0;

  return (
    <div className="space-y-4">
      {plans === null ? (
        <div className="space-y-3"><CardSkeleton height="h-24" /><CardSkeleton height="h-24" /><CardSkeleton height="h-24" /></div>
      ) : plans.length === 0 ? (
        <EmptyState icon={PackageOpen} title="No plans available" description="Investment plans will appear here once published by the admin." tone="lime" />
      ) : (
        <div className="space-y-3">
          {plans.map((p) => {
            const isSelected = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { setSelected(p); setAmount(p.min_amount.toString()); }}
                className={`w-full text-left rounded-[24px] p-5 transition-all border-2 ${
                  isSelected ? "surface-lime border-transparent" : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base">{p.name}</h3>
                      {isSelected && <span className="w-5 h-5 rounded-full bg-black/80 text-white grid place-items-center"><Check className="w-3 h-3" /></span>}
                    </div>
                    <p className={`text-xs mt-0.5 ${isSelected ? "opacity-70" : "text-muted-foreground"}`}>
                      ${p.min_amount} – ${p.max_amount.toLocaleString()} · {p.duration_days}d
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{p.roi_percent}%</div>
                    <div className={`text-[10px] uppercase font-semibold ${isSelected ? "opacity-70" : "text-muted-foreground"}`}>ROI</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="rounded-3xl bg-card border border-border p-5 space-y-4 sticky bottom-24">
          <div className="space-y-2">
            <Label className="text-xs">Amount to invest (USD)</Label>
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
              min={selected.min_amount} max={selected.max_amount} className="rounded-xl h-12 text-lg font-semibold" />
            <p className="text-[11px] text-muted-foreground">Available: ${balance.toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-muted/40 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Profit</p>
              <p className="font-bold text-primary">+${profit.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-3">
              <p className="text-[10px] uppercase text-muted-foreground">Return in {selected.duration_days}d</p>
              <p className="font-bold">${(parseFloat(amount || "0") + profit).toFixed(2)}</p>
            </div>
          </div>
          <Button onClick={invest} disabled={loading} className="w-full h-12 rounded-full gradient-lime text-primary-foreground border-0 font-semibold">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <TrendingUp className="w-4 h-4 mr-2" /> Start investing
          </Button>
        </div>
      )}
    </div>
  );
};

export default InvestPanel;
