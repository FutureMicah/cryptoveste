import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Upload, Loader2 } from "lucide-react";

const USDT_ADDRESS = "0x37e39CcC88bfcD0a78087DD1188619530C355a95";

const DepositPanel = ({ userId, onDone }: { userId: string; onDone: () => void }) => {
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [senderWallet, setSenderWallet] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(USDT_ADDRESS);
    toast.success("Address copied");
  };

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!txHash) return toast.error("Enter the transaction hash");
    if (!file) return toast.error("Upload payment screenshot");

    setLoading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file);
      if (upErr) throw upErr;

      const { error } = await supabase.from("deposits").insert({
        user_id: userId,
        amount_usd: amt,
        tx_hash: txHash,
        sender_wallet: senderWallet || null,
        screenshot_url: path,
        status: "pending",
      });
      if (error) throw error;

      toast.success("Deposit submitted! Awaiting admin approval.");
      setAmount(""); setTxHash(""); setSenderWallet(""); setFile(null);
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 bg-card/50 border-border/50 space-y-5">
      <div>
        <h3 className="font-semibold text-lg mb-1">Deposit USDT (BEP20)</h3>
        <p className="text-sm text-muted-foreground">Send USDT on Binance Smart Chain to the address below, then submit proof.</p>
      </div>

      <div className="bg-background/50 rounded-lg p-4 border border-primary/20">
        <div className="text-xs text-muted-foreground mb-2">USDT BEP20 Address</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono bg-muted/30 p-2.5 rounded break-all">{USDT_ADDRESS}</code>
          <Button size="icon" variant="outline" onClick={copy}><Copy className="w-4 h-4" /></Button>
        </div>
        <p className="text-xs text-yellow-500 mt-2">⚠️ Only send USDT on BEP20. Other networks will be lost.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount Sent (USD)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100" />
        </div>
        <div className="space-y-2">
          <Label>Your Wallet (optional)</Label>
          <Input value={senderWallet} onChange={(e) => setSenderWallet(e.target.value)} placeholder="0x..." />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Transaction Hash</Label>
        <Input value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..." />
      </div>

      <div className="space-y-2">
        <Label>Payment Screenshot</Label>
        <label className="flex items-center gap-3 p-4 border-2 border-dashed border-border/50 rounded-lg cursor-pointer hover:border-primary/50 transition">
          <Upload className="w-5 h-5 text-primary" />
          <span className="text-sm">{file ? file.name : "Click to upload screenshot"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <Button onClick={submit} disabled={loading} className="w-full">
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Submit Deposit
      </Button>
    </Card>
  );
};

export default DepositPanel;
