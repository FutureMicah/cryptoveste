import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Wallet, DollarSign } from "lucide-react";

const AdminOverview = () => {
  const [stats, setStats] = useState({
    users: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    aum: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalPaidOut: 0,
    activeInvestments: 0,
  });

  const load = async () => {
    const [u, pd, pw, invActive, depApproved, wdPaid, walletTotals] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("deposits").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("user_investments").select("amount, total_paid").eq("status", "active"),
      supabase.from("deposits").select("amount_usd").eq("status", "approved"),
      supabase.from("withdrawals").select("amount_usd").in("status", ["approved", "paid"]),
      supabase.from("wallets").select("total_earned"),
    ]);
    const aum = (invActive.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
    const totalPaidOut = (walletTotals.data ?? []).reduce((s, r: any) => s + Number(r.total_earned), 0);
    const totalDeposited = (depApproved.data ?? []).reduce((s, r: any) => s + Number(r.amount_usd), 0);
    const totalWithdrawn = (wdPaid.data ?? []).reduce((s, r: any) => s + Number(r.amount_usd), 0);
    setStats({
      users: u.count ?? 0,
      pendingDeposits: pd.count ?? 0,
      pendingWithdrawals: pw.count ?? 0,
      aum,
      totalDeposited,
      totalWithdrawn,
      totalPaidOut,
      activeInvestments: (invActive.data ?? []).length,
    });
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_investments" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-400 bg-blue-500/15" },
    { label: "Pending Deposits", value: stats.pendingDeposits, icon: ArrowDownToLine, color: "text-yellow-400 bg-yellow-500/15" },
    { label: "Pending Withdrawals", value: stats.pendingWithdrawals, icon: ArrowUpFromLine, color: "text-orange-400 bg-orange-500/15" },
    { label: "Active Investments", value: stats.activeInvestments, icon: TrendingUp, color: "text-primary bg-primary/15" },
    { label: "AUM", value: fmt(stats.aum), icon: Wallet, color: "text-primary bg-primary/15" },
    { label: "Total Deposited", value: fmt(stats.totalDeposited), icon: ArrowDownToLine, color: "text-[hsl(var(--success))] bg-[hsl(var(--success))]/15" },
    { label: "Total Withdrawn", value: fmt(stats.totalWithdrawn), icon: ArrowUpFromLine, color: "text-destructive bg-destructive/15" },
    { label: "ROI Paid Out", value: fmt(stats.totalPaidOut), icon: DollarSign, color: "text-primary bg-primary/15" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-4 bg-card border-border rounded-2xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{c.label}</p>
              <p className="text-lg sm:text-xl font-bold mt-1 truncate">{c.value}</p>
            </div>
            <div className={`p-2 rounded-xl ${c.color} shrink-0`}><c.icon className="w-4 h-4" /></div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default AdminOverview;
