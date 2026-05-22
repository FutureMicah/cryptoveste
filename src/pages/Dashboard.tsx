import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, TrendingUp,
  Plus, Bell, Home, BarChart3, Clock, Search, Send, X, Zap, LogOut,
} from "lucide-react";
import InvestPanel from "@/components/invest/InvestPanel";
import DepositPanel from "@/components/invest/DepositPanel";
import WithdrawPanel from "@/components/invest/WithdrawPanel";
import HistoryTable from "@/components/invest/HistoryTable";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

type Panel = "invest" | "deposit" | "withdraw" | null;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { wallet, refresh } = useWallet(user?.id);
  const [activeInv, setActiveInv] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [tab, setTab] = useState<"home" | "invest" | "history">("home");
  const { prices } = useCryptoPrices();

  useEffect(() => {
    document.title = "Dashboard — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [p, inv, dep, wd] = await Promise.all([
        supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_investments").select("*, investment_plans(name, roi_percent)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("deposits").select("id, amount_usd, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("withdrawals").select("id, amount_usd, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setProfile(p.data);
      setActiveInv((inv.data as any[]) ?? []);
      const merged = [
        ...((dep.data ?? []).map((d) => ({ ...d, kind: "deposit" as const }))),
        ...((wd.data ?? []).map((w) => ({ ...w, kind: "withdraw" as const }))),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6);
      setRecentTx(merged);
    };
    load();
    const ch = supabase.channel(`dash-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_investments", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (loading || !user) return null;
  const balance = wallet?.balance_usd ?? 0;
  const earned = wallet?.total_earned ?? 0;
  const firstName = profile?.first_name || user.email?.split("@")[0] || "Investor";
  const initial = firstName.charAt(0).toUpperCase();

  const actions = [
    { id: "invest" as const, label: "Invest", icon: TrendingUp },
    { id: "deposit" as const, label: "Deposit", icon: ArrowDownLeft },
    { id: "withdraw" as const, label: "Withdraw", icon: ArrowUpRight },
  ];

  return (
    <div className="min-h-screen gradient-dark-card text-foreground pb-28">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full gradient-lime grid place-items-center font-bold text-primary-foreground text-lg">
            {initial}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <p className="font-semibold text-sm">{firstName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => signOut().then(() => navigate("/"))} className="w-10 h-10 rounded-full bg-card border border-border grid place-items-center hover:bg-muted transition">
            <LogOut className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-full bg-card border border-border grid place-items-center relative">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="px-5 max-w-2xl mx-auto space-y-5">
        {/* Balance Card */}
        <Card className="surface-lime rounded-[28px] p-6 border-0 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium opacity-70">Total Balance</p>
              <h1 className="text-4xl font-bold mt-1 tracking-tight">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
              {earned > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-black/15 px-2 py-0.5 rounded-full mt-2">
                  <TrendingUp className="w-3 h-3" /> +${earned.toFixed(2)} earned
                </span>
              )}
            </div>
            <button className="text-xs font-semibold opacity-70">•••</button>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2 mt-6">
            {actions.map((a) => (
              <button
                key={a.id}
                onClick={() => setPanel(a.id)}
                className="bg-black/15 hover:bg-black/25 transition rounded-2xl py-3 flex flex-col items-center gap-1"
              >
                <a.icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{a.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Live prices */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Live Prices</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
            {prices.map((p) => {
              const up = p.change24h >= 0;
              return (
                <div key={p.id} className="min-w-[140px] bg-card rounded-2xl p-4 border border-border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm">{p.symbol}</span>
                    <span className={`text-xs ${up ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                      {up ? "+" : ""}{p.change24h.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-lg font-bold">${p.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Active Investments */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Active Investments</h3>
            <button onClick={() => setPanel("invest")} className="text-xs text-primary font-semibold">View all ›</button>
          </div>
          {activeInv.length === 0 ? (
            <Card className="rounded-2xl p-6 text-center border-border bg-card">
              <p className="text-sm text-muted-foreground mb-3">No active investments yet.</p>
              <Button onClick={() => setPanel("invest")} size="sm" className="rounded-full">
                <Plus className="w-4 h-4 mr-1" /> Start Investing
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {activeInv.map((inv) => {
                const pct = Math.min(100, (inv.total_paid / inv.expected_return) * 100);
                return (
                  <Card key={inv.id} className="rounded-2xl p-4 border-border bg-card">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="font-semibold text-sm">{inv.investment_plans?.name}</p>
                        <p className="text-xs text-muted-foreground">${inv.amount} → ${inv.expected_return.toFixed(2)}</p>
                      </div>
                      <Badge className="bg-primary/15 text-primary border-0">{inv.investment_plans?.roi_percent}%</Badge>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Transactions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Transactions</h3>
            <button onClick={() => setTab("history")} className="text-xs text-primary font-semibold">View all ›</button>
          </div>
          {recentTx.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions yet.</p>
          ) : (
            <Card className="rounded-2xl border-border bg-card divide-y divide-border overflow-hidden">
              {recentTx.map((tx) => {
                const isDep = tx.kind === "deposit";
                return (
                  <div key={`${tx.kind}-${tx.id}`} className="flex items-center gap-3 p-4">
                    <div className={`w-10 h-10 rounded-full grid place-items-center ${isDep ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]" : "bg-primary/15 text-primary"}`}>
                      {isDep ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{isDep ? "Deposit" : "Withdrawal"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{tx.status} · {new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className={`text-sm font-semibold ${isDep ? "text-[hsl(var(--success))]" : ""}`}>
                      {isDep ? "+" : "−"}${Number(tx.amount_usd).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </section>

        {tab === "history" && (
          <section className="pt-2">
            <HistoryTable userId={user.id} />
          </section>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-xl border border-border rounded-full px-2 py-2 flex items-center gap-1 shadow-2xl z-40">
        <NavBtn icon={Home} label="Home" active={tab === "home"} onClick={() => setTab("home")} />
        <NavBtn icon={BarChart3} label="Invest" onClick={() => setPanel("invest")} />
        <button onClick={() => setPanel("deposit")} className="w-14 h-14 -my-2 rounded-full gradient-lime grid place-items-center glow-lime mx-1">
          <Plus className="w-6 h-6 text-primary-foreground" />
        </button>
        <NavBtn icon={Clock} label="History" active={tab === "history"} onClick={() => setTab("history")} />
        <NavBtn icon={Search} label="Admin" onClick={() => navigate("/admin")} />
      </nav>

      {/* Bottom Sheet Panels */}
      {panel && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setPanel(null)}>
          <div className="bg-background border border-border w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background/95 backdrop-blur px-5 py-4 flex items-center justify-between border-b border-border">
              <h3 className="font-bold capitalize">{panel}</h3>
              <button onClick={() => setPanel(null)} className="w-9 h-9 rounded-full bg-muted grid place-items-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              {panel === "invest" && <InvestPanel userId={user.id} balance={balance} onDone={() => { refresh(); setPanel(null); }} />}
              {panel === "deposit" && <DepositPanel userId={user.id} onDone={() => { refresh(); setPanel(null); }} />}
              {panel === "withdraw" && <WithdrawPanel userId={user.id} balance={balance} onDone={() => { refresh(); setPanel(null); }} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NavBtn = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
    <Icon className="w-5 h-5" />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default Dashboard;
