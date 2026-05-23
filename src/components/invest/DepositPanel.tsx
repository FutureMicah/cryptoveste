import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Upload, Loader2, ShieldCheck } from "lucide-react";

const USDT_ADDRESS = "0x37e39CcC88bfcD0a78087DD1188619530C355a95";

const DepositPanel = ({ userId, onDone }: { userId: string; onDone?: () => void }) => {
  const [amount, setAmount] = useState("");
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
        sender_wallet: senderWallet || null,
        screenshot_url: path,
        status: "pending",
      });
      if (error) throw error;

      toast.success("Deposit submitted. Admin will verify shortly.");
      setAmount(""); setSenderWallet(""); setFile(null);
      onDone?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="surface-lime rounded-[28px] p-5">
        <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">USDT BEP20 wallet</p>
        <div className="mt-2 flex items-center gap-2 bg-black/15 rounded-2xl p-3">
          <code className="flex-1 text-[11px] font-mono break-all">{USDT_ADDRESS}</code>
          <button onClick={copy} className="w-9 h-9 rounded-full bg-black/80 text-white grid place-items-center shrink-0">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] mt-3 opacity-80">⚠️ Send USDT on BEP20 (Binance Smart Chain) only. Other networks will be lost.</p>
      </div>

      <div className="rounded-3xl bg-card border border-border p-5 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Amount sent (USD)</Label>
          <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Sender wallet (optional)</Label>
          <Input value={senderWallet} onChange={(e) => setSenderWallet(e.target.value)} placeholder="0x..." className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Payment proof screenshot</Label>
          <label className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/60 transition">
            <Upload className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm truncate">{file ? file.name : "Tap to upload screenshot"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-xl p-3">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>Verification is performed manually by our admin. Your balance is credited once approved.</span>
        </div>
        <Button onClick={submit} disabled={loading} className="w-full h-12 rounded-full gradient-lime text-primary-foreground border-0 font-semibold">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit deposit
        </Button>
      </div>
    </div>
  );
};

export default DepositPanel;
