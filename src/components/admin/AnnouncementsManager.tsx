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
import { Megaphone, Trash2, Plus, CalendarClock } from "lucide-react";
import { logAdminAction } from "@/lib/auditLog";

const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

const AnnouncementsManager = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "",
    body: "",
    severity: "info",
    starts_at: toLocalInput(new Date().toISOString()),
    ends_at: "",
  });

  const load = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title || !form.body) return toast.error("Title and body required");
    const { data: { user } } = await supabase.auth.getUser();
    const payload: any = {
      title: form.title,
      body: form.body,
      severity: form.severity,
      created_by: user?.id,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };
    const { data, error } = await supabase.from("announcements").insert(payload).select().single();
    if (error) return toast.error(error.message);
    await logAdminAction("announcement.publish", { targetType: "announcement", targetId: data.id, details: { title: form.title, severity: form.severity } });
    toast.success("Announcement published");
    setForm({ title: "", body: "", severity: "info", starts_at: toLocalInput(new Date().toISOString()), ends_at: "" });
    load();
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("announcements").update({ is_active: v }).eq("id", id);
    await logAdminAction(v ? "announcement.activate" : "announcement.deactivate", { targetType: "announcement", targetId: id });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    await logAdminAction("announcement.delete", { targetType: "announcement", targetId: id });
    load();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4 rounded-2xl bg-card border-border space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Megaphone className="w-4 h-4 text-primary animate-glow-pulse" /> New announcement
        </div>
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
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] flex items-center gap-1"><CalendarClock className="w-3 h-3" />Starts</Label>
            <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="rounded-xl h-10 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] flex items-center gap-1"><CalendarClock className="w-3 h-3" />Ends (optional)</Label>
            <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="rounded-xl h-10 text-xs" />
          </div>
        </div>
        <Button onClick={create} className="w-full rounded-full gradient-lime border-0 text-primary-foreground hover:scale-[1.02] transition-transform">
          <Plus className="w-4 h-4 mr-2" />Publish
        </Button>
      </Card>

      <div className="space-y-2">
        {items.map((a, i) => {
          const now = Date.now();
          const start = +new Date(a.starts_at);
          const end = a.ends_at ? +new Date(a.ends_at) : null;
          const live = a.is_active && start <= now && (!end || end > now);
          return (
            <Card key={a.id} className="p-3 rounded-2xl bg-card border-border animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{a.severity}</Badge>
                    {live && <Badge className="text-[10px] bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-0">● Live</Badge>}
                    <p className="font-semibold text-xs">{a.title}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 break-words">{a.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(a.starts_at).toLocaleString()}{a.ends_at ? ` → ${new Date(a.ends_at).toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <Switch checked={a.is_active} onCheckedChange={(v) => toggle(a.id, v)} />
                  <button onClick={() => remove(a.id)} className="text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </Card>
          );
        })}
        {items.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-6">No announcements yet.</p>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsManager;
