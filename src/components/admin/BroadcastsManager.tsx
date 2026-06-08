import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Megaphone, Mail, Bell, Loader2 } from "lucide-react";
import { logAdminAction } from "@/lib/auditLog";

const BroadcastsManager = () => {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState<"all" | "not_banned" | "kyc_approved">("not_banned");
  const [channel, setChannel] = useState<{ inapp: boolean; email: boolean }>({ inapp: true, email: false });
  const [severity, setSeverity] = useState<"info" | "success" | "warning" | "critical">("info");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!subject.trim() || !body.trim()) return toast.error("Subject and body are required");
    if (!channel.inapp && !channel.email) return toast.error("Pick at least one channel");
    setSending(true);
    try {
      if (channel.inapp) {
        const { error } = await supabase.from("announcements").insert({
          title: subject, body, severity, is_active: true, starts_at: new Date().toISOString(),
        });
        if (error) throw error;
        await logAdminAction("announcement_broadcast", { details: { subject, segment, severity } });
      }
      if (channel.email) {
        const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px"><h1 style="color:#D4AF37;font-size:22px;margin:0 0 12px">${subject}</h1><div style="font-size:14px;line-height:1.6;color:#e5e5e5">${body.replace(/\n/g, "<br>")}</div><hr style="border:0;border-top:1px solid #333;margin:24px 0"><p style="font-size:11px;color:#888">— BlackPAL</p></div>`;
        const { data, error } = await supabase.functions.invoke("admin-user-actions", {
          body: { action: "broadcast_email", subject, html, segment },
        });
        if (error) throw error;
        toast.success(`Email sent to ${data?.sent ?? 0} of ${data?.total ?? 0} users`);
      } else {
        toast.success("In-app broadcast published");
      }
      setSubject(""); setBody("");
    } catch (e: any) {
      toast.error(e.message ?? "Broadcast failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-4 rounded-2xl space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold">Send a broadcast</h2>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Subject</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl" placeholder="Maintenance tonight, new ROI plan, …" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Message</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="rounded-xl" placeholder="What do you want users to know?" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <Label className="text-xs">Audience</Label>
          <select value={segment} onChange={(e) => setSegment(e.target.value as any)} className="w-full h-10 mt-1 rounded-xl border border-border bg-background px-2">
            <option value="all">All users</option>
            <option value="not_banned">Active (not banned)</option>
            <option value="kyc_approved">KYC approved only</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Severity (in-app)</Label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="w-full h-10 mt-1 rounded-xl border border-border bg-background px-2">
            <option value="info">Info</option><option value="success">Success</option>
            <option value="warning">Warning</option><option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={channel.inapp ? "default" : "outline"} onClick={() => setChannel({ ...channel, inapp: !channel.inapp })} className="rounded-full">
          <Bell className="w-3.5 h-3.5 mr-1" /> In-app banner
        </Button>
        <Button size="sm" variant={channel.email ? "default" : "outline"} onClick={() => setChannel({ ...channel, email: !channel.email })} className="rounded-full">
          <Mail className="w-3.5 h-3.5 mr-1" /> Email blast
        </Button>
      </div>

      <Button disabled={sending} onClick={send} className="w-full rounded-full gradient-lime border-0 text-primary-foreground h-11">
        {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Megaphone className="w-4 h-4 mr-2" />}
        Send broadcast
      </Button>
    </Card>
  );
};

export default BroadcastsManager;
