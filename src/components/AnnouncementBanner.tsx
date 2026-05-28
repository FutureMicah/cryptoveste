import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface Ann { id: string; title: string; body: string; severity: string; }

const AnnouncementBanner = () => {
  const [ann, setAnn] = useState<Ann | null>(null);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("dismissed_anns") || "[]"); } catch { return []; }
  });

  const load = async () => {
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("announcements")
      .select("id,title,body,severity,ends_at")
      .eq("is_active", true)
      .lte("starts_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(5);
    const live = (data ?? []).find((a: any) => !a.ends_at || a.ends_at > nowIso) as Ann | undefined;
    setAnn(live ?? null);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("ann-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (!ann || dismissed.includes(ann.id)) return null;

  const dismiss = () => {
    const next = [...dismissed, ann.id];
    setDismissed(next);
    localStorage.setItem("dismissed_anns", JSON.stringify(next));
  };

  const tone = {
    critical: "bg-destructive/15 border-destructive/40 text-destructive",
    warning: "bg-yellow-500/10 border-yellow-500/40 text-yellow-500",
    success: "bg-[hsl(var(--success))]/15 border-[hsl(var(--success))]/40 text-[hsl(var(--success))]",
    info: "bg-primary/10 border-primary/40 text-primary",
  }[ann.severity] ?? "bg-primary/10 border-primary/40 text-primary";

  const Icon = { critical: AlertTriangle, warning: AlertTriangle, success: CheckCircle2, info: Megaphone }[ann.severity] ?? Info;

  return (
    <div className={`rounded-2xl border p-3 flex items-start gap-2 ${tone} animate-fade-in shadow-lg`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5 animate-glow-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{ann.title}</p>
        <p className="text-[11px] opacity-90 break-words">{ann.body}</p>
      </div>
      <button onClick={dismiss} className="opacity-70 hover:opacity-100 shrink-0 transition-opacity"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
};

export default AnnouncementBanner;
