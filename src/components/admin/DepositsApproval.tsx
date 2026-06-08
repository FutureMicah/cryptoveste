import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, Check, X, Inbox, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ProofViewer from "./ProofViewer";
import EmptyState, { ListSkeleton } from "@/components/EmptyState";
import { logAdminAction } from "@/lib/auditLog";

interface Deposit {
  id: string;
  user_id: string;
  amount_usd: number;
  sender_wallet: string | null;
  screenshot_url: string | null;
  status: string;
  created_at: string;
}

const DepositsApproval = () => {
  const [items, setItems] = useState<Deposit[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [edit, setEdit] = useState<Deposit | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", status: "pending", note: "" });

  const openEdit = (d: Deposit) => {
    setEdit(d);
    setEditForm({ amount: String(d.amount_usd), status: d.status, note: "" });
  };

  const saveEdit = async () => {
    if (!edit) return;
    const { error } = await supabase.rpc("admin_update_deposit", {
      _deposit_id: edit.id, _new_amount: parseFloat(editForm.amount),
      _new_status: editForm.status, _note: editForm.note || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Deposit updated");
    setEdit(null); load();
  };

  const remove = async (d: Deposit) => {
    if (!confirm("Delete this deposit? Wallet impact will be reversed if approved.")) return;
    const { error } = await supabase.rpc("admin_delete_deposit", { _deposit_id: d.id });
    if (error) return toast.error(error.message);
    toast.success("Deposit deleted"); load();
  };


  const load = async () => {
    let q = supabase.from("deposits").select("*").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data } = await q;
    setItems((data as Deposit[]) ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const decide = async (d: Deposit, status: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("deposits").update({
      status, reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", d.id);
    if (error) return toast.error(error.message);
    await logAdminAction(`deposit_${status}`, { targetType: "deposit", targetId: d.id, targetUserId: d.user_id, details: { amount: d.amount_usd } });
    toast.success(`Deposit ${status}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Deposits</h2>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pending</Button>
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
        </div>
      </div>

      {items === null ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title={filter === "pending" ? "No pending deposits" : "No deposits yet"} description="Submitted deposits will show up here for review." />
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <Card key={d.id} className="p-4 bg-card border-border rounded-2xl">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold text-lg">${Number(d.amount_usd).toFixed(2)}</div>
                  {d.sender_wallet && (
                    <div className="text-[11px] text-muted-foreground font-mono truncate">from {d.sender_wallet}</div>
                  )}
                  <div className="text-[11px] text-muted-foreground">{new Date(d.created_at).toLocaleString()} · user {d.user_id.slice(0, 8)}</div>
                </div>
                <Badge>{d.status}</Badge>
                <div className="flex gap-2">
                  {d.screenshot_url && (
                    <Button size="sm" variant="outline" onClick={() => setProofPath(d.screenshot_url)}>
                      <Eye className="w-4 h-4 mr-1" /> Proof
                    </Button>
                  )}
                  {d.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => decide(d, "approved")} className="gradient-lime border-0 text-primary-foreground">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(d, "rejected")}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(d)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProofViewer path={proofPath} onClose={() => setProofPath(null)} />

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Edit deposit</DialogTitle></DialogHeader>
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

export default DepositsApproval;
