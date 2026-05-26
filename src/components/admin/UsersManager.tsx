import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Search, Ban, ShieldOff, ShieldCheck, DollarSign, Plus, X, Inbox, User as UserIcon } from "lucide-react";
import EmptyState, { ListSkeleton } from "@/components/EmptyState";
import { logAdminAction } from "@/lib/auditLog";

const UsersManager = () => {
  const [users, setUsers] = useState<any[] | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
    setUsers(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = (users ?? []).filter((u) =>
    !q || `${u.first_name ?? ""} ${u.last_name ?? ""} ${u.username ?? ""} ${u.id}`.toLowerCase().includes(q.toLowerCase())
  );

  const setBan = async (id: string, banned: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_banned: banned }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAdminAction(banned ? "user_banned" : "user_unbanned", { targetType: "profile", targetUserId: id });
    toast.success(banned ? "User banned" : "User unbanned");
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or id" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-xl h-10 pl-9" />
        </div>
      </div>

      {users === null ? <ListSkeleton rows={5} /> : filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="No users" description="Users will appear here." />
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => <UserRow key={u.id} user={u} onBan={setBan} onChanged={load} />)}
        </div>
      )}
    </div>
  );
};

const UserRow = ({ user, onBan, onChanged }: { user: any; onBan: (id: string, b: boolean) => void; onChanged: () => void }) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [adj, setAdj] = useState({ amount: "", reason: "", kind: "credit" });
  const [topup, setTopup] = useState({ amount: "", note: "" });
  const [invForm, setInvForm] = useState({ plan_id: "", amount: "" });

  const load = async () => {
    const [w, inv, dep, wd, kyc] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_investments").select("*, investment_plans(name, roi_percent)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("deposits").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("user_kyc").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setData({ wallet: w.data, inv: inv.data ?? [], dep: dep.data ?? [], wd: wd.data ?? [], kyc: kyc.data });
  };

  useEffect(() => {
    if (open) {
      load();
      supabase.from("investment_plans").select("*").eq("is_active", true).order("sort_order").then(({ data }) => setPlans(data ?? []));
    }
  }, [open]);

  const adjust = async () => {
    const amt = parseFloat(adj.amount);
    if (!amt) return toast.error("Enter amount");
    const { error } = await supabase.rpc("admin_adjust_balance", { _user_id: user.id, _amount: amt, _reason: adj.reason || null, _kind: adj.kind });
    if (error) return toast.error(error.message);
    toast.success(`${adj.kind === "credit" ? "Credited" : "Debited"} $${amt}`);
    setAdj({ amount: "", reason: "", kind: "credit" });
    load(); onChanged();
  };

  const doTopup = async () => {
    const amt = parseFloat(topup.amount);
    if (!amt) return toast.error("Enter amount");
    const { error } = await supabase.rpc("admin_credit_deposit", { _user_id: user.id, _amount: amt, _note: topup.note || null });
    if (error) return toast.error(error.message);
    toast.success(`Deposited $${amt}`);
    setTopup({ amount: "", note: "" });
    load(); onChanged();
  };

  const createInv = async () => {
    const amt = parseFloat(invForm.amount);
    if (!amt || !invForm.plan_id) return toast.error("Plan and amount required");
    const { error } = await supabase.rpc("admin_create_investment", { _user_id: user.id, _plan_id: invForm.plan_id, _amount: amt });
    if (error) return toast.error(error.message);
    toast.success("Investment created");
    setInvForm({ plan_id: "", amount: "" });
    load();
  };

  const cancelInv = async (id: string) => {
    if (!confirm("Cancel and refund principal?")) return;
    const { error } = await supabase.rpc("admin_cancel_investment", { _investment_id: id });
    if (error) return toast.error(error.message);
    toast.success("Cancelled");
    load();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Card className="p-3 rounded-2xl bg-card border-border cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted grid place-items-center overflow-hidden">
              {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{[user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || user.id.slice(0, 8)}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.country || "—"} · {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
            {user.is_banned && <Badge variant="destructive" className="text-[10px]">Banned</Badge>}
          </div>
        </Card>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader><SheetTitle className="text-base">{[user.first_name, user.last_name].filter(Boolean).join(" ") || user.id.slice(0, 8)}</SheetTitle></SheetHeader>
        {!data ? <p className="text-xs text-muted-foreground mt-4">Loading…</p> : (
          <div className="space-y-3 mt-3">
            <Card className="p-3 rounded-2xl">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-muted-foreground text-[10px]">Balance</p><p className="font-bold">${Number(data.wallet?.balance_usd ?? 0).toFixed(2)}</p></div>
                <div><p className="text-muted-foreground text-[10px]">Invested</p><p className="font-bold">${Number(data.wallet?.total_invested ?? 0).toFixed(2)}</p></div>
                <div><p className="text-muted-foreground text-[10px]">Earned</p><p className="font-bold">${Number(data.wallet?.total_earned ?? 0).toFixed(2)}</p></div>
                <div><p className="text-muted-foreground text-[10px]">Withdrawn</p><p className="font-bold">${Number(data.wallet?.total_withdrawn ?? 0).toFixed(2)}</p></div>
              </div>
            </Card>

            <Card className="p-3 rounded-2xl space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-primary" />KYC</p>
              {data.kyc ? (
                <p className="text-[11px]">Status: <Badge className="ml-1">{data.kyc.status}</Badge> · {data.kyc.full_name}</p>
              ) : <p className="text-[11px] text-muted-foreground">Not submitted</p>}
            </Card>

            <Card className="p-3 rounded-2xl space-y-2">
              <p className="text-xs font-semibold">Manual balance adjustment</p>
              <div className="grid grid-cols-3 gap-2">
                <select value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value })} className="h-10 rounded-xl border border-border bg-background px-2 text-xs">
                  <option value="credit">Credit</option><option value="debit">Debit</option>
                </select>
                <Input type="number" placeholder="$" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} className="rounded-xl h-10" />
                <Button onClick={adjust} size="sm" className="rounded-full gradient-lime border-0 text-primary-foreground"><DollarSign className="w-3.5 h-3.5" /></Button>
              </div>
              <Input placeholder="Reason (optional)" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} className="rounded-xl h-9 text-xs" />
            </Card>

            <Card className="p-3 rounded-2xl space-y-2">
              <p className="text-xs font-semibold">Manual deposit (top-up)</p>
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" placeholder="$" value={topup.amount} onChange={(e) => setTopup({ ...topup, amount: e.target.value })} className="rounded-xl h-10 col-span-1" />
                <Input placeholder="Note" value={topup.note} onChange={(e) => setTopup({ ...topup, note: e.target.value })} className="rounded-xl h-10 col-span-2" />
              </div>
              <Button onClick={doTopup} size="sm" className="w-full rounded-full gradient-lime border-0 text-primary-foreground"><Plus className="w-3.5 h-3.5 mr-1" />Credit deposit</Button>
            </Card>

            <Card className="p-3 rounded-2xl space-y-2">
              <p className="text-xs font-semibold">Create investment for user</p>
              <div className="grid grid-cols-2 gap-2">
                <select value={invForm.plan_id} onChange={(e) => setInvForm({ ...invForm, plan_id: e.target.value })} className="h-10 rounded-xl border border-border bg-background px-2 text-xs">
                  <option value="">Plan…</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.roi_percent}%)</option>)}
                </select>
                <Input type="number" placeholder="$" value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })} className="rounded-xl h-10" />
              </div>
              <Button onClick={createInv} size="sm" className="w-full rounded-full" variant="outline">Create investment</Button>
            </Card>

            <Card className="p-3 rounded-2xl space-y-2">
              <p className="text-xs font-semibold">Investments</p>
              {data.inv.length === 0 ? <p className="text-[11px] text-muted-foreground">None</p> :
                data.inv.map((i: any) => (
                  <div key={i.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{i.investment_plans?.name} · ${Number(i.amount).toFixed(0)} → ${Number(i.expected_return).toFixed(0)}</span>
                    <Badge className="text-[10px]">{i.status}</Badge>
                    {i.status === "active" && <Button size="sm" variant="ghost" className="text-destructive h-7 px-2" onClick={() => cancelInv(i.id)}><X className="w-3.5 h-3.5" /></Button>}
                  </div>
                ))
              }
            </Card>

            <Button variant={user.is_banned ? "outline" : "destructive"} className="w-full rounded-full" onClick={() => onBan(user.id, !user.is_banned)}>
              {user.is_banned ? <><ShieldCheck className="w-4 h-4 mr-2" />Unban user</> : <><Ban className="w-4 h-4 mr-2" />Ban user</>}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default UsersManager;
