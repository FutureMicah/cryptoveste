import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, RefreshCw, Search, Inbox } from "lucide-react";
import EmptyState, { ListSkeleton } from "@/components/EmptyState";

const AuditLogViewer = () => {
  const [logs, setLogs] = useState<any[] | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLogs(null);
    const { data } = await supabase
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs(data ?? []);
  };
  useEffect(() => {
    load();
    const ch = supabase
      .channel("audit-log")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_audit_log" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = (logs ?? []).filter(
    (l) =>
      !q ||
      `${l.action} ${l.actor_email ?? ""} ${l.target_type ?? ""} ${JSON.stringify(l.details ?? {})}`
        .toLowerCase()
        .includes(q.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-primary" /> Audit log
        </h2>
        <Button size="sm" variant="outline" onClick={load} className="rounded-full h-8">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search action, admin, target…"
          className="rounded-xl h-10 pl-9"
        />
      </div>

      {logs === null ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="No audit entries" description="Admin actions will appear here." />
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <Card key={l.id} className="p-3 rounded-2xl bg-card border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">
                    <Badge className="mr-2 text-[10px]" variant="outline">
                      {l.action}
                    </Badge>
                    {l.target_type ?? "—"}
                    {l.target_user_id && (
                      <span className="text-muted-foreground"> · user {l.target_user_id.slice(0, 8)}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    by {l.actor_email ?? l.actor_id?.slice(0, 8)} · {new Date(l.created_at).toLocaleString()}
                  </p>
                  {l.details && Object.keys(l.details).length > 0 && (
                    <pre className="text-[10px] text-muted-foreground mt-1 whitespace-pre-wrap break-all bg-muted/30 rounded-lg p-2 max-h-24 overflow-auto">
                      {JSON.stringify(l.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;
