import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Wallet, Trash2, Plus, Save } from "lucide-react";

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
    const { error } = await supabase.from("deposit_addresses").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Address added");
    setForm({ currency: "", network: "", address: "", min_amount: 10, sort_order: 0 });
    load();
  };

  const save = async (id: string, patch: any) => {
    const { error } = await supabase.from("deposit_addresses").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    await supabase.from("deposit_addresses").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 rounded-2xl bg-card border-border space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm"><Wallet className="w-4 h-4 text-primary" /> Add wallet address</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-[11px]">Currency</Label><Input placeholder="USDT" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="rounded-xl h-10" /></div>
          <div className="space-y-1"><Label className="text-[11px]">Network</Label><Input placeholder="BEP20" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} className="rounded-xl h-10" /></div>
        </div>
        <div className="space-y-1"><Label className="text-[11px]">Address</Label><Input placeholder="0x..." value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-xl h-10 font-mono text-xs" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-[11px]">Min ($)</Label><Input type="number" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: Number(e.target.value) })} className="rounded-xl h-10" /></div>
          <div className="space-y-1"><Label className="text-[11px]">Sort</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="rounded-xl h-10" /></div>
        </div>
        <Button onClick={create} className="w-full rounded-full gradient-lime border-0 text-primary-foreground"><Plus className="w-4 h-4 mr-2" />Add</Button>
      </Card>

      <div className="space-y-2">
        {items.map((a) => (
          <Card key={a.id} className="p-3 rounded-2xl bg-card border-border space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-xs">{a.currency} · {a.network}</p>
                <p className="text-[10px] text-muted-foreground font-mono break-all">{a.address}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch checked={a.is_active} onCheckedChange={(v) => save(a.id, { is_active: v })} />
                <button onClick={() => remove(a.id)} className="text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input className="rounded-xl h-9 text-xs" defaultValue={a.address} onBlur={(e) => e.target.value !== a.address && save(a.id, { address: e.target.value })} />
              <Input className="rounded-xl h-9 text-xs" type="number" defaultValue={a.min_amount} onBlur={(e) => Number(e.target.value) !== a.min_amount && save(a.id, { min_amount: Number(e.target.value) })} />
              <Input className="rounded-xl h-9 text-xs" type="number" defaultValue={a.sort_order} onBlur={(e) => Number(e.target.value) !== a.sort_order && save(a.id, { sort_order: Number(e.target.value) })} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DepositAddressesManager;
