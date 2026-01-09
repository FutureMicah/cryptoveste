import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, LogOut, Eye, RefreshCw, Users, DollarSign, Share2, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import QuickStats from "@/components/admin/QuickStats";
import AdminLogin from "@/components/admin/AdminLogin";
import PaymentProofViewer from "@/components/admin/PaymentProofViewer";
import UsersManagement from "@/components/admin/UsersManagement";
import PaymentsOverview from "@/components/admin/PaymentsOverview";
import ReferralsManagement from "@/components/admin/ReferralsManagement";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentProofs, setPaymentProofs] = useState<any[]>([]);
  const [kycDocuments, setKycDocuments] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);

  useEffect(() => {
    const adminAuth = sessionStorage.getItem("adminAuth");
    if (adminAuth === "true") {
      setIsAuthenticated(true);
      loadDashboardData();
    }
    setLoading(false);
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: proofs } = await supabase
        .from("payment_proofs")
        .select(`
          *,
          profiles:user_id (first_name, last_name, detected_country, country_code),
          documents:document_id (id, file_path, file_name)
        `)
        .order("created_at", { ascending: false });

      setPaymentProofs(proofs || []);

      const { data: kyc } = await supabase
        .from("investor_kyc_documents")
        .select(`
          *,
          profiles:user_id (first_name, last_name, detected_country, country_code)
        `)
        .order("created_at", { ascending: false });

      setKycDocuments(kyc || []);

      const { data: interviewData } = await supabase
        .from("admin_interviews")
        .select(`
          *,
          profiles:user_id (first_name, last_name, detected_country, country_code)
        `)
        .order("scheduled_at", { ascending: true });

      setInterviews(interviewData || []);

      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      setTotalUsers(count || 0);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const handlePaymentAction = async (proofId: string, action: "approve" | "reject", reason?: string) => {
    try {
      const updates: any = {
        status: action === "approve" ? "approved" : "rejected",
      };

      if (action === "reject" && reason) {
        updates.rejection_reason = reason;
      }

      if (action === "approve") {
        updates.verified_at = new Date().toISOString();
      }

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

      if (proofData?.user_id) {
        if (action === "approve" && proofData?.payment_id) {
          await supabase
            .from("payments")
            .update({ status: "completed" })
            .eq("id", proofData.payment_id);

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
        } else if (action === "reject") {
          // Send rejection email with reason
          try {
            await supabase.functions.invoke("send-notification", {
              body: {
                userId: proofData.user_id,
                type: "payment_rejected",
                data: {
                  reason: reason || "Payment proof could not be verified",
                },
              },
            });
            toast.success("Payment rejected and notification email sent!");
          } catch (emailError) {
            console.error("Email send error:", emailError);
            toast.success("Payment rejected (email notification failed)");
          }
        }
      }

      loadDashboardData();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} payment`);
    }
  };

  const handleKYCAction = async (kycId: string, action: "approve" | "reject", reason?: string) => {
    try {
      const { data: kycData } = await supabase
        .from("investor_kyc_documents")
        .select("user_id, document_type")
        .eq("id", kycId)
        .single();

      const updates: any = {
        status: action === "approve" ? "approved" : "rejected",
      };

      if (action === "reject" && reason) {
        updates.rejection_reason = reason;
      }

      if (action === "approve") {
        updates.reviewed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("investor_kyc_documents")
        .update(updates)
        .eq("id", kycId);

      if (error) throw error;

      // Send KYC status notification
      if (kycData?.user_id) {
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              userId: kycData.user_id,
              type: "kyc_status",
              data: {
                status: action === "approve" ? "approved" : "rejected",
                documentType: kycData.document_type,
                reason: reason,
              },
            },
          });
        } catch (emailError) {
          console.error("Email send error:", emailError);
        }
      }

      toast.success(`KYC document ${action}d successfully`);
      loadDashboardData();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} KYC`);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth");
    sessionStorage.removeItem("adminEmail");
    setIsAuthenticated(false);
    toast.success("Logged out successfully");
  };

  const getCountryFlag = (countryCode: string) => {
    if (!countryCode) return "🌍";
    return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => {
      setIsAuthenticated(true);
      loadDashboardData();
    }} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {viewingDocument && (
        <PaymentProofViewer
          documentId={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage payments, users, KYC, and more</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadDashboardData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <QuickStats
          pendingPayments={paymentProofs.filter(p => p.status === "submitted").length}
          pendingKYC={kycDocuments.filter(k => k.status === "pending").length}
          scheduledInterviews={interviews.filter(i => i.status === "scheduled").length}
          totalUsers={totalUsers}
        />

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="payments">
              <DollarSign className="w-4 h-4 mr-2" />
              Verify ({paymentProofs.filter(p => p.status === "submitted").length})
            </TabsTrigger>
            <TabsTrigger value="all-payments">
              Payments
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="referrals">
              <Share2 className="w-4 h-4 mr-2" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="kyc">
              KYC ({kycDocuments.filter(k => k.status === "pending").length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Recent Payment Proofs</h3>
                {paymentProofs.slice(0, 5).map((proof) => (
                  <div key={proof.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-foreground">
                        {proof.profiles?.first_name} {proof.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {proof.currency} {proof.amount?.toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      proof.status === "submitted" ? "bg-yellow-500/20 text-yellow-500" :
                      proof.status === "approved" ? "bg-green-500/20 text-green-500" :
                      "bg-red-500/20 text-red-500"
                    }`}>
                      {proof.status}
                    </span>
                  </div>
                ))}
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Upcoming Interviews</h3>
                {interviews.filter(i => i.status === "scheduled").slice(0, 5).map((interview) => (
                  <div key={interview.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-foreground">
                        {interview.profiles?.first_name} {interview.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(interview.scheduled_at).toLocaleString()}
                      </p>
                    </div>
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                ))}
                {interviews.filter(i => i.status === "scheduled").length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No upcoming interviews</p>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Payment Verification Tab */}
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
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground">
                            {proof.profiles?.first_name} {proof.profiles?.last_name}
                          </span>
                          
                          {proof.profiles?.detected_country && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                              {proof.profiles?.country_code && (
                                <img 
                                  src={getCountryFlag(proof.profiles.country_code)} 
                                  alt="" 
                                  className="w-4 h-3 rounded"
                                />
                              )}
                              {proof.profiles.detected_country}
                            </span>
                          )}
                          
                          <span className={`px-2 py-1 rounded text-xs ${
                            proof.status === "submitted" ? "bg-yellow-500/20 text-yellow-500" :
                            proof.status === "approved" ? "bg-green-500/20 text-green-500" :
                            "bg-red-500/20 text-red-500"
                          }`}>
                            {proof.status}
                          </span>
                          {proof.name_verification_status === "failed" && (
                            <span className="px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-400">
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
                        {proof.rejection_reason && (
                          <p className="text-sm text-red-400">
                            Reason: {proof.rejection_reason}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(proof.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {proof.document_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingDocument(proof.document_id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                        
                        {proof.status === "submitted" && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* All Payments Tab */}
          <TabsContent value="all-payments">
            <PaymentsOverview />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <ReferralsManagement />
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground">
                            {kyc.profiles?.first_name} {kyc.profiles?.last_name}
                          </span>
                          
                          {kyc.profiles?.detected_country && (
                            <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                              {kyc.profiles?.country_code && (
                                <img 
                                  src={getCountryFlag(kyc.profiles.country_code)} 
                                  alt="" 
                                  className="w-4 h-3 rounded"
                                />
                              )}
                              {kyc.profiles.detected_country}
                            </span>
                          )}
                          
                          <span className={`px-2 py-1 rounded text-xs ${
                            kyc.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                            kyc.status === "approved" ? "bg-green-500/20 text-green-500" :
                            "bg-red-500/20 text-red-500"
                          }`}>
                            {kyc.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Document Type: {kyc.document_type?.replace(/_/g, " ").toUpperCase()}
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
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
