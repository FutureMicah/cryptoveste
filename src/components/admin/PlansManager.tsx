import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Plan {
  id?: string;
  name: string;
  description: string;
  min_amount: number;
  max_amount: number;
  roi_percent: number;
  duration_days: number;
  is_active: boolean;
  sort_order: number;
}

const empty: Plan = { name: "", description: "", min_amount: 50, max_amount: 1000, roi_percent: 10, duration_days: 30, is_active: true, sort_order: 0 };

const PlansManager = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Plan | null>(null);

  const load = () => supabase.from("investment_plans").select("*").order("sort_order").then(({ data }) => setPlans((data as Plan[]) ?? []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    const { id, ...rest } = editing;
    const op = id
      ? supabase.from("investment_plans").update(rest).eq("id", id)
      : supabase.from("investment_plans").insert(rest);
    const { error } = await op;
    if (error) return toast.error(error.message);
    toast.success("Plan saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.from("investment_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Investment Plans</h2>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="w-4 h-4 mr-2" />New Plan</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => (
          <Card key={p.id} className="p-5 bg-card/50 border-border/50">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold">{p.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${p.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                {p.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="text-2xl font-bold text-primary">{p.roi_percent}%</div>
            <div className="text-xs text-muted-foreground mb-3">{p.duration_days} days · ${p.min_amount}–${p.max_amount}</div>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
              <Button size="sm" variant="outline" onClick={() => remove(p.id!)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <Card className="p-6 bg-card/80 border-primary/30 space-y-4 sticky bottom-4 z-10">
          <h3 className="font-semibold">{editing.id ? "Edit Plan" : "New Plan"}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div><Label>Sort Order</Label><Input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div><Label>Min Amount ($)</Label><Input type="number" value={editing.min_amount} onChange={(e) => setEditing({ ...editing, min_amount: +e.target.value })} /></div>
            <div><Label>Max Amount ($)</Label><Input type="number" value={editing.max_amount} onChange={(e) => setEditing({ ...editing, max_amount: +e.target.value })} /></div>
            <div><Label>ROI %</Label><Input type="number" value={editing.roi_percent} onChange={(e) => setEditing({ ...editing, roi_percent: +e.target.value })} /></div>
            <div><Label>Duration (days)</Label><Input type="number" value={editing.duration_days} onChange={(e) => setEditing({ ...editing, duration_days: +e.target.value })} /></div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlansManager;
