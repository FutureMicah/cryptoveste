import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, AlertCircle, LogOut } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import QuickStats from "@/components/admin/QuickStats";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [paymentProofs, setPaymentProofs] = useState<any[]>([]);
  const [kycDocuments, setKycDocuments] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      // Check if user has admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdminRole = roles?.some(r => 
        r.role === "admin" || r.role === "super_admin"
      );

      if (!hasAdminRole) {
        toast.error("Access denied - Admin privileges required");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      loadDashboardData();
    } catch (error) {
      console.error("Admin check error:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    // Load payment proofs
    const { data: proofs } = await supabase
      .from("payment_proofs")
      .select(`
        *,
        profiles:user_id (first_name, last_name, email)
      `)
      .order("created_at", { ascending: false });

    setPaymentProofs(proofs || []);

    // Load KYC documents
    const { data: kyc } = await supabase
      .from("investor_kyc_documents")
      .select(`
        *,
        profiles:user_id (first_name, last_name, email)
      `)
      .order("created_at", { ascending: false });

    setKycDocuments(kyc || []);

    // Load interviews
    const { data: interviewData } = await supabase
      .from("admin_interviews")
      .select(`
        *,
        profiles:user_id (first_name, last_name, email)
      `)
      .order("scheduled_at", { ascending: true });

    setInterviews(interviewData || []);

    // Load total users count
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    setTotalUsers(count || 0);
  };

  const handlePaymentAction = async (proofId: string, action: "approve" | "reject", reason?: string) => {
    try {
      const updates: any = {
        status: action === "approve" ? "approved" : "rejected",
      };

      if (action === "reject" && reason) {
        updates.rejection_reason = reason;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (action === "approve") {
        updates.verified_by = user?.id;
        updates.verified_at = new Date().toISOString();
      }

      // Get the payment proof to find the user
      const { data: proofData } = await supabase
        .from("payment_proofs")
        .select("user_id, payment_id")
        .eq("id", proofId)
        .single();

      const { error } = await supabase
        .from("payment_proofs")
        .update(updates)
        .eq("id", proofId);

      if (error) throw error;

      // If approved, update the main payment status and send welcome email
      if (action === "approve" && proofData?.payment_id) {
        await supabase
          .from("payments")
          .update({ status: "completed" })
          .eq("id", proofData.payment_id);

        // Send welcome email with group links
        if (proofData?.user_id) {
          try {
            await supabase.functions.invoke("send-notification", {
              body: {
                userId: proofData.user_id,
                type: "payment_approved",
                data: {
                  paymentMethod: "Manual Verification",
                  amount: "Enrollment",
                },
              },
            });
            toast.success("Payment approved and welcome email sent!");
          } catch (emailError) {
            console.error("Email send error:", emailError);
            toast.success("Payment approved (email notification failed)");
          }
        }
      } else {
        toast.success(`Payment ${action}d successfully`);
      }

      loadDashboardData();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} payment`);
    }
  };

  const handleKYCAction = async (kycId: string, action: "approve" | "reject", reason?: string) => {
    try {
      const updates: any = {
        status: action === "approve" ? "approved" : "rejected",
      };

      if (action === "reject" && reason) {
        updates.rejection_reason = reason;
      }

      if (action === "approve") {
        const { data: { user } } = await supabase.auth.getUser();
        updates.reviewed_by = user?.id;
        updates.reviewed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("investor_kyc_documents")
        .update(updates)
        .eq("id", kycId);

      if (error) throw error;

      toast.success(`KYC document ${action}d successfully`);
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} KYC`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage payments, KYC, and interviews</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Quick Stats */}
        <QuickStats
          pendingPayments={paymentProofs.filter(p => p.status === "submitted").length}
          pendingKYC={kycDocuments.filter(k => k.status === "pending").length}
          scheduledInterviews={interviews.filter(i => i.status === "scheduled").length}
          totalUsers={totalUsers}
        />

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payments">
              Payment Verification ({paymentProofs.filter(p => p.status === "submitted").length})
            </TabsTrigger>
            <TabsTrigger value="kyc">
              KYC Documents ({kycDocuments.filter(k => k.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="interviews">
              Interviews ({interviews.filter(i => i.status === "scheduled").length})
            </TabsTrigger>
          </TabsList>

          {/* Payment Proofs Tab */}
          <TabsContent value="payments" className="space-y-4">
            {paymentProofs.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No payment proofs to review
              </Card>
            ) : (
              paymentProofs.map((proof) => (
                <motion.div
                  key={proof.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {proof.profiles?.first_name} {proof.profiles?.last_name}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            proof.status === "submitted" ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" :
                            proof.status === "approved" ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                            "bg-red-500/20 text-red-700 dark:text-red-400"
                          }`}>
                            {proof.status}
                          </span>
                          {proof.name_verification_status === "failed" && (
                            <span className="px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-700 dark:text-orange-400">
                              Name Mismatch
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Amount: {proof.currency} {proof.amount?.toLocaleString()}
                        </p>
                        {proof.payment_account_name && (
                          <p className="text-sm text-muted-foreground">
                            Payment Account: {proof.payment_account_name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(proof.created_at).toLocaleString()}
                        </p>
                      </div>

                      {proof.status === "submitted" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handlePaymentAction(proof.id, "approve")}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const reason = prompt("Enter rejection reason:");
                              if (reason) handlePaymentAction(proof.id, "reject", reason);
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc" className="space-y-4">
            {kycDocuments.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No KYC documents to review
              </Card>
            ) : (
              kycDocuments.map((kyc) => (
                <motion.div
                  key={kyc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {kyc.profiles?.first_name} {kyc.profiles?.last_name}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            kyc.status === "pending" ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" :
                            kyc.status === "approved" ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                            "bg-red-500/20 text-red-700 dark:text-red-400"
                          }`}>
                            {kyc.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Document Type: {kyc.document_type.replace(/_/g, " ").toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(kyc.created_at).toLocaleString()}
                        </p>
                      </div>

                      {kyc.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleKYCAction(kyc.id, "approve")}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const reason = prompt("Enter rejection reason:");
                              if (reason) handleKYCAction(kyc.id, "reject", reason);
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* Interviews Tab */}
          <TabsContent value="interviews" className="space-y-4">
            {interviews.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No scheduled interviews
              </Card>
            ) : (
              interviews.map((interview) => (
                <motion.div
                  key={interview.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <span className="font-bold text-foreground">
                          {interview.profiles?.first_name} {interview.profiles?.last_name}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          interview.status === "scheduled" ? "bg-blue-500/20 text-blue-700 dark:text-blue-400" :
                          interview.status === "completed" ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                          "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                        }`}>
                          {interview.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Scheduled: {new Date(interview.scheduled_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {interview.duration_minutes} minutes
                      </p>
                      {interview.meeting_link && (
                        <a
                          href={interview.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Join Meeting →
                        </a>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
