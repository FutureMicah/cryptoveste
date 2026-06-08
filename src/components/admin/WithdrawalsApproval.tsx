import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Send, Pencil, Trash2, Inbox } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { logAdminAction } from "@/lib/auditLog";

const WithdrawalsApproval = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [edit, setEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState({ amount: "", status: "pending", note: "" });

  const load = async () => {
    let q = supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const decide = async (w: any, status: "approved" | "rejected" | "paid") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("withdrawals").update({
      status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", w.id);
    if (error) return toast.error(error.message);
    await logAdminAction(`withdrawal_${status}`, { targetType: "withdrawal", targetId: w.id, targetUserId: w.user_id, details: { amount: w.amount_usd, wallet_address: w.wallet_address } });
    toast.success(`Withdrawal ${status}`);
    load();
  };

  const openEdit = (w: any) => { setEdit(w); setEditForm({ amount: String(w.amount_usd), status: w.status, note: "" }); };
  const saveEdit = async () => {
    if (!edit) return;
    const { error } = await supabase.rpc("admin_update_withdrawal", {
      _withdrawal_id: edit.id, _new_amount: parseFloat(editForm.amount),
      _new_status: editForm.status, _note: editForm.note || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Withdrawal updated"); setEdit(null); load();
  };
  const remove = async (w: any) => {
    if (!confirm("Delete this withdrawal? Funds will be refunded if previously approved.")) return;
    const { error } = await supabase.rpc("admin_delete_withdrawal", { _withdrawal_id: w.id });
    if (error) return toast.error(error.message);
    toast.success("Withdrawal deleted"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Withdrawals</h2>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pending</Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Inbox} title="No withdrawals" description="Pending requests will appear here." />
      ) : items.map((w) => (
        <Card key={w.id} className="p-4 bg-card border-border rounded-2xl">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex-1 min-w-[180px]">
              <div className="font-semibold text-lg">${Number(w.amount_usd).toFixed(2)}</div>
              <div className="text-xs font-mono text-muted-foreground truncate max-w-md">→ {w.wallet_address}</div>
              <div className="text-[11px] text-muted-foreground">{new Date(w.created_at).toLocaleString()} · user {w.user_id.slice(0, 8)}</div>
            </div>
            <Badge>{w.status}</Badge>
            <div className="flex gap-2 flex-wrap">
              {w.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => decide(w, "approved")}><Check className="w-4 h-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => decide(w, "rejected")}><X className="w-4 h-4" /></Button>
                </>
              )}
              {w.status === "approved" && (
                <Button size="sm" onClick={() => decide(w, "paid")}><Send className="w-4 h-4 mr-1" />Paid</Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(w)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        </Card>
      ))}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Edit withdrawal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Amount (USD)</label>
              <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Admin note</label>
              <Input value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)} className="rounded-full">Cancel</Button>
            <Button onClick={saveEdit} className="rounded-full gradient-lime border-0 text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WithdrawalsApproval;
