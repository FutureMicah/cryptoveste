import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const WithdrawPanel = ({ userId, balance, onDone }: { userId: string; balance: number; onDone: () => void }) => {
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > balance) return toast.error("Amount exceeds your balance");
    if (!wallet || wallet.length < 10) return toast.error("Enter a valid wallet address");

    setLoading(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: userId,
      amount_usd: amt,
      wallet_address: wallet,
      status: "pending",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal requested! Admin will process shortly.");
    setAmount(""); setWallet("");
    onDone();
  };

  return (
    <Card className="p-6 bg-card/50 border-border/50 space-y-5">
      <div>
        <h3 className="font-semibold text-lg mb-1">Request a Withdrawal</h3>
        <p className="text-sm text-muted-foreground">Funds are sent as USDT on BEP20 after admin approval.</p>
      </div>
      <div className="space-y-2">
        <Label>Amount (USD)</Label>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} max={balance} />
        <p className="text-xs text-muted-foreground">Available: ${balance.toFixed(2)}</p>
      </div>
      <div className="space-y-2">
        <Label>Your USDT BEP20 Address</Label>
        <Input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x..." />
      </div>
      <Button onClick={submit} disabled={loading} className="w-full">
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Request Withdrawal
      </Button>
    </Card>
  );
};

export default WithdrawPanel;
