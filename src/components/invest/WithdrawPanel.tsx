import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";

const WithdrawPanel = ({ userId, balance, onDone }: { userId: string; balance: number; onDone?: () => void }) => {
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > balance) return toast.error("Amount exceeds available balance");
    if (!wallet || wallet.length < 10) return toast.error("Enter a valid wallet address");

    setLoading(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: userId, amount_usd: amt, wallet_address: wallet, status: "pending",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal requested. Admin will process shortly.");
    setAmount(""); setWallet("");
    onDone?.();
  };

  return (
    <div className="space-y-4">
      <div className="surface-lime rounded-[28px] p-5">
        <div className="flex items-center gap-2 text-xs font-semibold opacity-70 uppercase">
          <Wallet className="w-4 h-4" /> Available balance
        </div>
        <div className="text-3xl font-bold mt-1">${balance.toFixed(2)}</div>
        <p className="text-[11px] mt-1 opacity-70">USDT BEP20 · processed manually</p>
      </div>

      <div className="rounded-3xl bg-card border border-border p-5 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Amount (USD)</Label>
          <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} max={balance} placeholder="0.00" className="rounded-xl h-12" />
          <div className="flex gap-2">
            {[25, 50, 100].map((pct) => (
              <button key={pct} type="button" onClick={() => setAmount(((balance * pct) / 100).toFixed(2))} className="text-[11px] px-3 py-1 rounded-full bg-muted text-muted-foreground hover:text-foreground">
                {pct}%
              </button>
            ))}
            <button type="button" onClick={() => setAmount(balance.toFixed(2))} className="text-[11px] px-3 py-1 rounded-full bg-primary/15 text-primary">Max</button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Your USDT BEP20 address</Label>
          <Input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x..." className="rounded-xl h-12 font-mono text-xs" />
        </div>
        <Button onClick={submit} disabled={loading} className="w-full h-12 rounded-full gradient-lime text-primary-foreground border-0 font-semibold">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Request withdrawal
        </Button>
      </div>
    </div>
  );
};

export default WithdrawPanel;
