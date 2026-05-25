import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Upload, Loader2, ShieldCheck } from "lucide-react";

interface Addr {
  id: string;
  currency: string;
  network: string;
  address: string;
  min_amount: number;
  notes: string | null;
}

const DepositPanel = ({ userId, onDone }: { userId: string; onDone?: () => void }) => {
  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [senderWallet, setSenderWallet] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("deposit_addresses")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      const list = (data as Addr[]) ?? [];
      setAddresses(list);
      if (list[0]) setSelected(list[0].id);
    })();
  }, []);

  const active = addresses.find((a) => a.id === selected);

  const copy = () => {
    if (!active) return;
    navigator.clipboard.writeText(active.address);
    toast.success("Address copied");
  };

  const submit = async () => {
    if (!active) return toast.error("Select a currency");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt < Number(active.min_amount)) return toast.error(`Minimum is $${active.min_amount}`);
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
        admin_notes: `${active.currency} ${active.network}`,
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
        <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">Select asset</p>
        <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
          {addresses.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
                a.id === selected ? "bg-black text-primary" : "bg-black/15 text-foreground/80"
              }`}
            >
              {a.currency} · {a.network}
            </button>
          ))}
        </div>
        {active && (
          <>
            <div className="mt-3 flex items-center gap-2 bg-black/15 rounded-2xl p-3">
              <code className="flex-1 text-[11px] font-mono break-all">{active.address}</code>
              <button onClick={copy} className="w-9 h-9 rounded-full bg-black/80 text-white grid place-items-center shrink-0">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] mt-3 opacity-80">
              ⚠️ Send {active.currency} on {active.network} only. Min ${Number(active.min_amount).toFixed(2)}. Other networks will be lost.
            </p>
          </>
        )}
      </div>

      <div className="rounded-3xl bg-card border border-border p-5 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Amount sent (USD)</Label>
          <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100" className="rounded-xl h-12" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Sender wallet (optional)</Label>
          <Input value={senderWallet} onChange={(e) => setSenderWallet(e.target.value)} placeholder="Your wallet address" className="rounded-xl h-12 font-mono text-xs" />
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
