import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";

type Tab = "all" | "deposits" | "withdrawals" | "investments";

const statusColor = (s: string) => {
  if (s === "approved" || s === "paid" || s === "completed" || s === "active") return "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]";
  if (s === "rejected") return "bg-destructive/15 text-destructive";
  return "bg-yellow-500/15 text-yellow-500";
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);

  useEffect(() => {
    document.title = "History — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [d, w, i] = await Promise.all([
        supabase.from("deposits").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_investments").select("*, investment_plans(name, roi_percent)").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setDeposits(d.data ?? []);
      setWithdrawals(w.data ?? []);
      setInvestments(i.data ?? []);
    };
    load();
    const ch = supabase.channel(`hist-page-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_investments", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (loading || !user) return null;

  const allItems = [
    ...deposits.map((d) => ({ kind: "deposit" as const, id: d.id, amount: d.amount_usd, status: d.status, date: d.created_at })),
    ...withdrawals.map((w) => ({ kind: "withdraw" as const, id: w.id, amount: w.amount_usd, status: w.status, date: w.created_at })),
    ...investments.map((i) => ({ kind: "invest" as const, id: i.id, amount: i.amount, status: i.status, date: i.created_at, plan: i.investment_plans?.name })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const visible =
    tab === "deposits" ? allItems.filter((x) => x.kind === "deposit")
    : tab === "withdrawals" ? allItems.filter((x) => x.kind === "withdraw")
    : tab === "investments" ? allItems.filter((x) => x.kind === "invest")
    : allItems;

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "deposits", label: "Deposits" },
    { id: "withdrawals", label: "Withdrawals" },
    { id: "investments", label: "Invests" },
  ];

  return (
    <AppShell title="History" back>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 -mx-4 px-4">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              tab === t.id ? "gradient-lime text-primary-foreground" : "bg-card border border-border text-muted-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="surface-lime rounded-[28px] p-8 text-center mt-4">
          <p className="font-semibold">No activity yet</p>
          <p className="text-xs opacity-70 mt-1">Your transactions will show up here.</p>
        </div>
      ) : (
        <div className="rounded-3xl bg-card border border-border divide-y divide-border overflow-hidden mt-2">
          {visible.map((x) => {
            const Icon = x.kind === "deposit" ? ArrowDownLeft : x.kind === "withdraw" ? ArrowUpRight : TrendingUp;
            const sign = x.kind === "deposit" ? "+" : x.kind === "withdraw" ? "−" : "·";
            const tint = x.kind === "deposit" ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
              : x.kind === "withdraw" ? "bg-destructive/15 text-destructive"
              : "bg-primary/15 text-primary";
            return (
              <div key={`${x.kind}-${x.id}`} className="flex items-center gap-3 p-4">
                <div className={`w-11 h-11 rounded-full grid place-items-center shrink-0 ${tint}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize">
                    {x.kind === "invest" ? `Invested · ${(x as any).plan ?? "Plan"}` : x.kind}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{new Date(x.date).toLocaleString()}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-bold">{sign}${Number(x.amount).toFixed(2)}</p>
                  <Badge className={`text-[10px] border-0 ${statusColor(x.status)}`}>{x.status}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
};

export default HistoryPage;
