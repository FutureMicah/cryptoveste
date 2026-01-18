import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Wallet, CheckCircle, XCircle, Clock, RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Payout {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  paystack_reference: string | null;
  admin_notes: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    referral_code: string;
  };
}

const PayoutsManagement = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payouts")
        .select(`
          *,
          profiles:user_id (first_name, last_name, referral_code)
        `)
        .order("requested_at", { ascending: false });

      if (error) throw error;
      setPayouts(data || []);
    } catch (error) {
      console.error("Error loading payouts:", error);
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const handleAction = async () => {
    if (!selectedPayout || !actionType) return;

    setProcessing(true);
    try {
      if (actionType === "approve") {
        // Update payout status
        const { error: updateError } = await supabase
          .from("payouts")
          .update({
            status: "completed",
            processed_at: new Date().toISOString(),
            paystack_reference: reference || null,
            admin_notes: notes || null,
          })
          .eq("id", selectedPayout.id);

        if (updateError) throw updateError;

        // Send email notification
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              userId: selectedPayout.user_id,
              type: "payout_processed",
              data: {
                amount: selectedPayout.amount,
                reference: reference,
              },
            },
          });
        } catch (emailError) {
          console.error("Email send error:", emailError);
        }

        toast.success("Payout approved and user notified");
      } else {
        // Reject payout - restore user's balance
        const { data: profile } = await supabase
          .from("profiles")
          .select("total_earnings")
          .eq("id", selectedPayout.user_id)
          .single();

        const newBalance = (profile?.total_earnings || 0) + selectedPayout.amount;

        await supabase
          .from("profiles")
          .update({ total_earnings: newBalance })
          .eq("id", selectedPayout.user_id);

        // Update payout status
        const { error: updateError } = await supabase
          .from("payouts")
          .update({
            status: "rejected",
            processed_at: new Date().toISOString(),
            admin_notes: notes || "Payout request declined",
          })
          .eq("id", selectedPayout.id);

        if (updateError) throw updateError;

        // Send email notification
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              userId: selectedPayout.user_id,
              type: "payout_rejected",
              data: {
                amount: selectedPayout.amount,
                reason: notes || "Your payout request could not be processed at this time.",
              },
            },
          });
        } catch (emailError) {
          console.error("Email send error:", emailError);
        }

        toast.success("Payout rejected, balance restored, user notified");
      }

      setSelectedPayout(null);
      setActionType(null);
      setReference("");
      setNotes("");
      loadPayouts();
    } catch (error: any) {
      console.error("Payout action error:", error);
      toast.error(error.message || "Failed to process payout");
    } finally {
      setProcessing(false);
    }
  };

  const pendingPayouts = payouts.filter(p => p.status === "pending");
  const totalPending = pendingPayouts.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Action Dialog */}
      <Dialog open={!!selectedPayout && !!actionType} onOpenChange={() => {
        setSelectedPayout(null);
        setActionType(null);
        setReference("");
        setNotes("");
      }}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              {actionType === "approve" ? "Approve Payout" : "Reject Payout"}
            </DialogTitle>
            <DialogDescription>
              {selectedPayout?.profiles?.first_name} {selectedPayout?.profiles?.last_name} - ₦{selectedPayout?.amount?.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === "approve" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Reference (optional)</label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g., Transfer reference number"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {actionType === "approve" ? "Notes (optional)" : "Rejection Reason"}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={actionType === "approve" ? "Any admin notes..." : "Reason for rejection..."}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedPayout(null);
              setActionType(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              className={actionType === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {processing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : actionType === "approve" ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Payouts</p>
              <p className="text-2xl font-bold text-yellow-500">{pendingPayouts.length}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Pending Amount</p>
              <p className="text-2xl font-bold text-foreground">₦{totalPending.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </Card>
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Payouts</p>
              <p className="text-2xl font-bold text-foreground">{payouts.length}</p>
            </div>
            <Wallet className="w-8 h-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Payout Requests</h3>
          <Button size="sm" variant="outline" onClick={loadPayouts} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : payouts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No payout requests yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Requested</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="text-xs">
                      <div>
                        <p className="font-medium">
                          {payout.profiles?.first_name} {payout.profiles?.last_name}
                        </p>
                        <p className="text-muted-foreground text-[10px] font-mono">
                          {payout.profiles?.referral_code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold">
                      ₦{payout.amount?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        payout.status === "completed"
                          ? "bg-green-500/20 text-green-500"
                          : payout.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-500"
                          : "bg-red-500/20 text-red-500"
                      }`}>
                        {payout.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(payout.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {payout.status === "pending" ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-green-500 hover:bg-green-500/20"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setActionType("approve");
                            }}
                          >
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-500 hover:bg-red-500/20"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setActionType("reject");
                            }}
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString() : "-"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PayoutsManagement;
