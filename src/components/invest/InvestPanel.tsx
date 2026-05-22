import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  min_amount: number;
  max_amount: number;
  roi_percent: number;
  duration_days: number;
}

const InvestPanel = ({ userId, balance, onDone }: { userId: string; balance: number; onDone: () => void }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("investment_plans").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

  const invest = async () => {
    if (!selected) return;
    const amt = parseFloat(amount);
    if (!amt || amt < selected.min_amount || amt > selected.max_amount) {
      return toast.error(`Amount must be between $${selected.min_amount} and $${selected.max_amount}`);
    }
    if (amt > balance) return toast.error("Insufficient balance. Deposit first.");

    setLoading(true);
    const { error } = await supabase.from("user_investments").insert({
      user_id: userId,
      plan_id: selected.id,
      amount: amt,
      expected_return: 0, // overridden by trigger
      ends_at: new Date().toISOString(), // overridden by trigger
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Investment created!");
    setSelected(null);
    setAmount("");
    onDone();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Choose a plan</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <Card
            key={p.id}
            onClick={() => { setSelected(p); setAmount(p.min_amount.toString()); }}
            className={`p-5 cursor-pointer border-2 transition-all ${selected?.id === p.id ? "border-primary bg-primary/5" : "border-border/50 bg-card/50 hover:border-primary/40"}`}
          >
            <h4 className="font-bold">{p.name}</h4>
            <div className="text-3xl font-bold text-primary mt-2">{p.roi_percent}%</div>
            <div className="text-xs text-muted-foreground">in {p.duration_days} days</div>
            <div className="text-xs mt-3 text-muted-foreground">${p.min_amount} – ${p.max_amount.toLocaleString()}</div>
          </Card>
        ))}
      </div>

      {selected && (
        <Card className="p-5 bg-card/50 border-border/50 space-y-4">
          <div>
            <Label>Amount to invest in {selected.name} (USD)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={selected.min_amount} max={selected.max_amount} />
            <p className="text-xs text-muted-foreground mt-1">Available balance: ${balance.toFixed(2)}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={invest} disabled={loading} className="flex-1">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm investment
            </Button>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default InvestPanel;
