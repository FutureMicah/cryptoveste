import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { CardSkeleton } from "@/components/EmptyState";

type Row = { date: string; deposits: number; withdrawals: number; investments: number };

const fmtDay = (d: Date) => d.toISOString().slice(0, 10);

const AnalyticsPanel = () => {
  const [deposits, setDeposits] = useState<any[] | null>(null);
  const [withdrawals, setWithdrawals] = useState<any[] | null>(null);
  const [investments, setInvestments] = useState<any[] | null>(null);
  const [plans, setPlans] = useState<any[]>([]);

  const load = async () => {
    const since = new Date(Date.now() - 29 * 86400000).toISOString();
    const [d, w, i, p] = await Promise.all([
      supabase.from("deposits").select("amount_usd, status, created_at").gte("created_at", since),
      supabase.from("withdrawals").select("amount_usd, status, created_at").gte("created_at", since),
      supabase.from("user_investments").select("amount, status, plan_id, created_at, investment_plans(name)").gte("created_at", since),
      supabase.from("investment_plans").select("id, name"),
    ]);
    setDeposits(d.data ?? []); setWithdrawals(w.data ?? []); setInvestments(i.data ?? []); setPlans(p.data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("analytics-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_investments" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const series: Row[] = useMemo(() => {
    const days: Row[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days.push({ date: fmtDay(d).slice(5), deposits: 0, withdrawals: 0, investments: 0 });
    }
    const idx = (iso: string) => {
      const day = fmtDay(new Date(iso)).slice(5);
      return days.findIndex((r) => r.date === day);
    };
    (deposits ?? []).filter((x) => x.status === "approved").forEach((x) => { const i = idx(x.created_at); if (i >= 0) days[i].deposits += Number(x.amount_usd); });
    (withdrawals ?? []).filter((x) => ["approved", "paid"].includes(x.status)).forEach((x) => { const i = idx(x.created_at); if (i >= 0) days[i].withdrawals += Number(x.amount_usd); });
    (investments ?? []).forEach((x) => { const i = idx(x.created_at); if (i >= 0) days[i].investments += Number(x.amount); });
    return days;
  }, [deposits, withdrawals, investments]);

  const planDist = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {};
    (investments ?? []).forEach((x) => {
      const name = x.investment_plans?.name ?? "Other";
      map[name] = map[name] ?? { name, value: 0 };
      map[name].value += Number(x.amount);
    });
    return Object.values(map);
  }, [investments]);

  const totals = useMemo(() => ({
    deposits: series.reduce((s, r) => s + r.deposits, 0),
    withdrawals: series.reduce((s, r) => s + r.withdrawals, 0),
    investments: series.reduce((s, r) => s + r.investments, 0),
  }), [series]);

  const loading = deposits === null || withdrawals === null || investments === null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <CardSkeleton height="h-20" /><CardSkeleton height="h-20" /><CardSkeleton height="h-20" />
        </div>
        <CardSkeleton height="h-72" />
        <CardSkeleton height="h-72" />
      </div>
    );
  }

  const COLORS = ["hsl(var(--primary))", "#60a5fa", "#f59e0b", "#ec4899", "#10b981", "#a855f7"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 rounded-2xl">
          <p className="text-[10px] uppercase text-muted-foreground">Deposits (30d)</p>
          <p className="text-lg font-bold">${totals.deposits.toLocaleString()}</p>
        </Card>
        <Card className="p-4 rounded-2xl">
          <p className="text-[10px] uppercase text-muted-foreground">Withdrawals (30d)</p>
          <p className="text-lg font-bold">${totals.withdrawals.toLocaleString()}</p>
        </Card>
        <Card className="p-4 rounded-2xl">
          <p className="text-[10px] uppercase text-muted-foreground">Invested (30d)</p>
          <p className="text-lg font-bold">${totals.investments.toLocaleString()}</p>
        </Card>
      </div>

      <Card className="p-4 rounded-2xl">
        <p className="text-sm font-semibold mb-3">Cash flow (last 30 days)</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Area type="monotone" dataKey="deposits" stroke="hsl(var(--primary))" fill="url(#gd)" name="Deposits" />
              <Area type="monotone" dataKey="withdrawals" stroke="hsl(var(--destructive))" fill="url(#gw)" name="Withdrawals" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4 rounded-2xl">
        <p className="text-sm font-semibold mb-3">Investments per day</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Bar dataKey="investments" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {planDist.length > 0 && (
        <Card className="p-4 rounded-2xl">
          <p className="text-sm font-semibold mb-3">Plan distribution</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {planDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsPanel;
