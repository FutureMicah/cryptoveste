import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Wallet, Trash2, Plus, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { validateAddress } from "@/lib/walletValidate";
import { logAdminAction } from "@/lib/auditLog";

const DepositAddressesManager = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ currency: "", network: "", address: "", min_amount: 10, sort_order: 0 });

  const load = async () => {
    const { data } = await supabase.from("deposit_addresses").select("*").order("sort_order");
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.currency || !form.network || !form.address) return toast.error("All fields required");
    const v = validateAddress(form.currency, form.network, form.address);
    if (!v.ok) return toast.error(v.reason || "Invalid address");
    const { data, error } = await supabase.from("deposit_addresses").insert(form).select().single();
    if (error) return toast.error(error.message);
    await logAdminAction("deposit_address_added", { targetType: "deposit_address", targetId: data?.id, details: { ...form } });
    toast.success("Address added");
    setForm({ currency: "", network: "", address: "", min_amount: 10, sort_order: 0 });
    load();
  };

  const save = async (a: any, patch: any) => {
    if (patch.address) {
      const v = validateAddress(patch.currency ?? a.currency, patch.network ?? a.network, patch.address);
      if (!v.ok) return toast.error(v.reason || "Invalid address");
    }
    const { error } = await supabase.from("deposit_addresses").update(patch).eq("id", a.id);
    if (error) return toast.error(error.message);
    await logAdminAction("deposit_address_updated", { targetType: "deposit_address", targetId: a.id, details: patch });
    toast.success("Saved");
    load();
  };

  const remove = async (a: any) => {
    if (!confirm("Delete this address?")) return;
    await supabase.from("deposit_addresses").delete().eq("id", a.id);
    await logAdminAction("deposit_address_deleted", { targetType: "deposit_address", targetId: a.id, details: { currency: a.currency, network: a.network } });
    load();
  };

  const test = (a: any) => {
    const v = validateAddress(a.currency, a.network, a.address);
    v.ok ? toast.success(`${a.currency} (${a.network}) address looks valid`) : toast.error(v.reason || "Invalid format");
  };

  const formValidation = form.address ? validateAddress(form.currency, form.network, form.address) : null;

  return (
    <div className="space-y-4">
      <Card className="p-4 rounded-2xl bg-card border-border space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Wallet className="w-4 h-4 text-primary" /> Add wallet address
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px]">Currency</Label>
            <Input placeholder="USDT / BTC / ETH" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="rounded-xl h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Network</Label>
            <Input placeholder="BEP20 / TRC20 / ERC20 / BTC" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value.toUpperCase() })} className="rounded-xl h-10" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Address</Label>
          <Input placeholder="Paste real deposit address…" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-xl h-10 font-mono text-xs" />
          {formValidation && (
            <p className={`text-[10px] flex items-center gap-1 ${formValidation.ok ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
              {formValidation.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {formValidation.ok ? "Format looks valid" : formValidation.reason}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px]">Min ($)</Label>
            <Input type="number" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: Number(e.target.value) })} className="rounded-xl h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Sort</Label>
            <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="rounded-xl h-10" />
          </div>
        </div>
        <Button onClick={create} className="w-full rounded-full gradient-lime border-0 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />Add
        </Button>
      </Card>

      <div className="space-y-2">
        {items.map((a) => {
          const v = validateAddress(a.currency, a.network, a.address);
          return (
            <Card key={a.id} className="p-3 rounded-2xl bg-card border-border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-xs flex items-center gap-1.5">
                    {a.currency} · {a.network}
                    {v.ok ? (
                      <CheckCircle2 className="w-3 h-3 text-[hsl(var(--success))]" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-destructive" />
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono break-all">{a.address}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={a.is_active} onCheckedChange={(val) => save(a, { is_active: val })} />
                  <button onClick={() => navigator.clipboard.writeText(a.address).then(() => toast.success("Copied"))} className="p-1 text-muted-foreground" title="Copy">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(a)} className="text-destructive p-1" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <Input className="rounded-xl h-9 text-xs font-mono" defaultValue={a.address} onBlur={(e) => e.target.value !== a.address && save(a, { address: e.target.value })} />
                <Input className="rounded-xl h-9 text-xs w-20" type="number" defaultValue={a.min_amount} onBlur={(e) => Number(e.target.value) !== a.min_amount && save(a, { min_amount: Number(e.target.value) })} />
                <Input className="rounded-xl h-9 text-xs w-14" type="number" defaultValue={a.sort_order} onBlur={(e) => Number(e.target.value) !== a.sort_order && save(a, { sort_order: Number(e.target.value) })} />
                <Button size="sm" variant="outline" className="rounded-full h-9 text-[10px] px-3" onClick={() => test(a)}>Test</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DepositAddressesManager;
