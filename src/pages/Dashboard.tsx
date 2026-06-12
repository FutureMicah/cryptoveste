import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUpRight, ArrowDownLeft, TrendingUp, Plus, Bell, Shield, Eye, EyeOff, MessageCircle,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import KycStatusBanner from "@/components/KycStatusBanner";
import { SupportChatWidget } from "@/components/SupportChatWidget";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import holoCard from "@/assets/holo-card.jpeg";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wallet } = useWallet(user?.id);
  const [activeInv, setActiveInv] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [hide, setHide] = useState(false);
  const [unread, setUnread] = useState(0);
  const { prices } = useCryptoPrices();

  useEffect(() => {
    document.title = "Dashboard — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [p, inv, dep, wd, kyc] = await Promise.all([
        supabase.from("profiles").select("first_name,avatar_url,is_banned").eq("id", user.id).maybeSingle(),
        supabase.from("user_investments").select("*, investment_plans(name, roi_percent, duration_days)")
          .eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(3),
        supabase.from("deposits").select("id, amount_usd, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("withdrawals").select("id, amount_usd, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("user_kyc").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      if (p.data?.is_banned) { await supabase.auth.signOut(); navigate("/"); return; }
      if (!kyc.data) { navigate("/kyc"); return; }
      setProfile(p.data);
      setActiveInv((inv.data as any[]) ?? []);
      const merged = [
        ...((dep.data ?? []).map((d) => ({ ...d, kind: "deposit" as const }))),
        ...((wd.data ?? []).map((w) => ({ ...w, kind: "withdraw" as const }))),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 5);
      setRecentTx(merged);
    };
    load();
    const loadUnread = async () => {
      const { count } = await supabase
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("sender_type", "admin")
        .eq("is_read", false);
      setUnread(count ?? 0);
    };
    loadUnread();
    const ch = supabase.channel(`dash-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_investments", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `user_id=eq.${user.id}` }, loadUnread)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, navigate]);

  if (loading || !user) return null;
  const balance = wallet?.balance_usd ?? 0;
  const earned = wallet?.total_earned ?? 0;
  const invested = wallet?.total_invested ?? 0;
  const firstName = profile?.first_name || user.email?.split("@")[0] || "Investor";
  const initial = firstName.charAt(0).toUpperCase();

  const masked = (v: number) => (hide ? "••••••" : `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  return (
    <div className="min-h-screen gradient-dark-card text-foreground pb-24 overflow-x-hidden">
      <header className="px-3 pt-4 pb-2 flex items-center justify-between gap-2 max-w-md mx-auto">
        <Link to="/profile" className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full gradient-lime grid place-items-center font-bold text-primary-foreground text-sm shrink-0 overflow-hidden">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initial}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground leading-tight">Welcome back</p>
            <p className="font-semibold text-xs truncate">{firstName}</p>
          </div>
        </Link>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-full bg-card border border-border grid place-items-center" aria-label="Admin">
            <Shield className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-full bg-card border border-border grid place-items-center" aria-label="Notifications">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="px-3 max-w-md mx-auto space-y-3">
        <AnnouncementBanner />
        <KycStatusBanner userId={user.id} />


        <section className="surface-lime rounded-[24px] p-4 shadow-2xl relative overflow-hidden animate-scale-in">
          {/* Floating holographic card visual */}
          <img
            src={holoCard}
            alt=""
            className="absolute -right-6 -top-4 w-28 h-28 object-contain opacity-70 animate-float pointer-events-none select-none mix-blend-luminosity"
          />
          {/* Shimmer sweep */}
          <div className="absolute inset-0 pointer-events-none opacity-30 animate-shimmer"
               style={{ background: "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)", backgroundSize: "200% 100%" }} />

          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold opacity-70 uppercase tracking-wide">Total balance</p>
              <button onClick={() => setHide((h) => !h)} className="w-7 h-7 rounded-full bg-black/15 grid place-items-center hover:bg-black/25 transition-colors">
                {hide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <h1 className="text-2xl font-bold mt-1 tracking-tight truncate">{masked(balance)}</h1>
            <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
              <span className="bg-black/15 px-2 py-0.5 rounded-full">Earned {hide ? "•••" : `$${earned.toFixed(2)}`}</span>
              <span className="bg-black/15 px-2 py-0.5 rounded-full">Invested {hide ? "•••" : `$${invested.toFixed(2)}`}</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 mt-4">
              {[
                { to: "/invest", I: TrendingUp, l: "Invest" },
                { to: "/deposit", I: ArrowDownLeft, l: "Deposit" },
                { to: "/withdraw", I: ArrowUpRight, l: "Send" },
                { to: "/history", I: Plus, l: "History" },
              ].map((a, i) => (
                <Link
                  key={a.l}
                  to={a.to}
                  className="bg-black/15 hover:bg-black/30 active:scale-95 transition-all rounded-xl py-2 flex flex-col items-center gap-0.5 animate-fade-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <a.I className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-semibold">{a.l}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-semibold text-xs">Live prices</h3>
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-3 px-3 pb-1">
            {prices.map((p) => {
              const up = p.change24h >= 0;
              return (
                <div key={p.id} className="min-w-[100px] bg-card border border-border rounded-xl p-2.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-semibold">{p.symbol}</span>
                    <span className={up ? "text-[hsl(var(--success))]" : "text-destructive"}>{up ? "+" : ""}{p.change24h.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs font-bold mt-0.5 truncate">${p.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-semibold text-xs">Active investments</h3>
            <Link to="/invest" className="text-[11px] text-primary font-semibold">+ New</Link>
          </div>
          {activeInv.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">No active investments yet.</p>
              <Button onClick={() => navigate("/invest")} size="sm" className="rounded-full gradient-lime border-0 text-primary-foreground h-8 text-xs">
                Start investing
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeInv.map((inv) => {
                const elapsed = (Date.now() - +new Date(inv.starts_at)) / (+new Date(inv.ends_at) - +new Date(inv.starts_at));
                const accrued = Math.min(1, Math.max(0, elapsed)) * Number(inv.expected_return);
                const pct = Math.min(100, (accrued / inv.expected_return) * 100);
                return (
                  <div key={inv.id} className="rounded-2xl bg-card border border-border p-3">
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate">{inv.investment_plans?.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">${Number(inv.amount).toFixed(2)} → ${Number(inv.expected_return).toFixed(2)}</p>
                      </div>
                      <Badge className="bg-primary/15 text-primary border-0 text-[10px] shrink-0">{inv.investment_plans?.roi_percent}%</Badge>
                    </div>
                    <Progress value={pct} className="h-1" />
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                      <span>+${accrued.toFixed(2)}</span>
                      <span>Paid ${Number(inv.total_paid).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-semibold text-xs">Recent transactions</h3>
            <Link to="/history" className="text-[11px] text-primary font-semibold">View all ›</Link>
          </div>
          {recentTx.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-4 text-center text-xs text-muted-foreground">
              No transactions yet.
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              {recentTx.map((tx) => {
                const isDep = tx.kind === "deposit";
                return (
                  <div key={`${tx.kind}-${tx.id}`} className="flex items-center gap-2 p-3">
                    <div className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${isDep ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]" : "bg-primary/15 text-primary"}`}>
                      {isDep ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{isDep ? "Deposit" : "Withdrawal"}</p>
                      <p className="text-[10px] text-muted-foreground capitalize truncate">{tx.status} · {new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className={`text-xs font-bold shrink-0 ${isDep ? "text-[hsl(var(--success))]" : ""}`}>
                      {isDep ? "+" : "−"}${Number(tx.amount_usd).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
      <SupportChatWidget />
    </div>
  );
};

export default Dashboard;
