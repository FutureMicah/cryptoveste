import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, ArrowDownToLine, ArrowUpFromLine, TrendingUp } from "lucide-react";

const AdminOverview = () => {
  const [stats, setStats] = useState({ users: 0, pendingDeposits: 0, pendingWithdrawals: 0, aum: 0 });

  useEffect(() => {
    (async () => {
      const [u, pd, pw, inv] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("deposits").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("user_investments").select("amount").eq("status", "active"),
      ]);
      const aum = (inv.data ?? []).reduce((s, r: any) => s + Number(r.amount), 0);
      setStats({ users: u.count ?? 0, pendingDeposits: pd.count ?? 0, pendingWithdrawals: pw.count ?? 0, aum });
    })();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-blue-400 bg-blue-500/20" },
    { label: "Pending Deposits", value: stats.pendingDeposits, icon: ArrowDownToLine, color: "text-yellow-400 bg-yellow-500/20" },
    { label: "Pending Withdrawals", value: stats.pendingWithdrawals, icon: ArrowUpFromLine, color: "text-orange-400 bg-orange-500/20" },
    { label: "AUM (Active)", value: `$${stats.aum.toLocaleString()}`, icon: TrendingUp, color: "text-green-400 bg-green-500/20" },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-5 bg-card/50 border-border/50">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </div>
            <div className={`p-2 rounded-lg ${c.color}`}><c.icon className="w-5 h-5" /></div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default AdminOverview;
