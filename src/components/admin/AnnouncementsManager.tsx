import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, Trash2, Plus } from "lucide-react";

const AnnouncementsManager = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "", severity: "info" });

  const load = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title || !form.body) return toast.error("Title and body required");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("announcements").insert({ ...form, created_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success("Announcement published");
    setForm({ title: "", body: "", severity: "info" });
    load();
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("announcements").update({ is_active: v }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 rounded-2xl bg-card border-border space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm"><Megaphone className="w-4 h-4 text-primary" /> New announcement</div>
        <div className="space-y-2">
          <Label className="text-xs">Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl h-10" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Body</Label>
          <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Severity</Label>
          <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className="w-full h-10 rounded-xl bg-background border border-border px-3 text-sm">
            <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="critical">Critical</option>
          </select>
        </div>
        <Button onClick={create} className="w-full rounded-full gradient-lime border-0 text-primary-foreground"><Plus className="w-4 h-4 mr-2" />Publish</Button>
      </Card>

      <div className="space-y-2">
        {items.map((a) => (
          <Card key={a.id} className="p-3 rounded-2xl bg-card border-border">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{a.severity}</Badge>
                  <p className="font-semibold text-xs">{a.title}</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 break-words">{a.body}</p>
              </div>
              <div className="flex flex-col gap-1 items-end shrink-0">
                <Switch checked={a.is_active} onCheckedChange={(v) => toggle(a.id, v)} />
                <button onClick={() => remove(a.id)} className="text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementsManager;
