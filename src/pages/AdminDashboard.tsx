import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { 
  CheckCircle, XCircle, Clock, LogOut, Eye, RefreshCw, Users, 
  DollarSign, Share2, LayoutDashboard, ArrowLeft, Calendar, Settings, Activity,
  MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import QuickStats from "@/components/admin/QuickStats";
import AdminLogin from "@/components/admin/AdminLogin";
import PaymentProofViewer from "@/components/admin/PaymentProofViewer";
import UsersManagement from "@/components/admin/UsersManagement";
import PaymentsOverview from "@/components/admin/PaymentsOverview";
import ReferralsManagement from "@/components/admin/ReferralsManagement";
import InterviewScheduling from "@/components/admin/InterviewScheduling";
import RealtimeNotifications from "@/components/admin/RealtimeNotifications";
import AdminSettings from "@/components/admin/AdminSettings";
import ActivityLogsViewer from "@/components/admin/ActivityLogsViewer";
import PayoutsManagement from "@/components/admin/PayoutsManagement";
import SupportChatManagement from "@/components/admin/SupportChatManagement";

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

  const loadDashboardData = useCallback(async () => {
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
  }, []);

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

  const handleBackToHome = () => {
    navigate("/");
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

      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToHome}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage payments, users, KYC, and interviews</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex-shrink-0">
              <RealtimeNotifications 
                onNewPaymentProof={loadDashboardData}
                onNewUser={loadDashboardData}
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadDashboardData} className="flex-shrink-0">
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="flex-shrink-0">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <QuickStats
          pendingPayments={paymentProofs.filter(p => p.status === "submitted").length}
          pendingKYC={kycDocuments.filter(k => k.status === "pending").length}
          scheduledInterviews={interviews.filter(i => i.status === "scheduled").length}
          totalUsers={totalUsers}
        />

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="flex-1 min-w-[100px]">
              <LayoutDashboard className="w-4 h-4 mr-1 hidden sm:inline" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 min-w-[100px]">
              <DollarSign className="w-4 h-4 mr-1 hidden sm:inline" />
              Verify ({paymentProofs.filter(p => p.status === "submitted").length})
            </TabsTrigger>
            <TabsTrigger value="all-payments" className="flex-1 min-w-[100px]">
              Payments
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1 min-w-[80px]">
              <Users className="w-4 h-4 mr-1 hidden sm:inline" />
              Users
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex-1 min-w-[80px]">
              <Share2 className="w-4 h-4 mr-1 hidden sm:inline" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex-1 min-w-[80px]">
              <DollarSign className="w-4 h-4 mr-1 hidden sm:inline" />
              Payouts
            </TabsTrigger>
            <TabsTrigger value="interviews" className="flex-1 min-w-[100px]">
              <Calendar className="w-4 h-4 mr-1 hidden sm:inline" />
              Interviews
            </TabsTrigger>
            <TabsTrigger value="kyc" className="flex-1 min-w-[80px]">
              KYC ({kycDocuments.filter(k => k.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 min-w-[80px]">
              <Activity className="w-4 h-4 mr-1 hidden sm:inline" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="support" className="flex-1 min-w-[80px]">
              <MessageCircle className="w-4 h-4 mr-1 hidden sm:inline" />
              Support
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 min-w-[80px]">
              <Settings className="w-4 h-4 mr-1 hidden sm:inline" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4 sm:p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Recent Payment Proofs</h3>
                <div className="space-y-2">
                  {paymentProofs.slice(0, 5).map((proof) => (
                    <div key={proof.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground text-sm truncate">
                            {proof.profiles?.first_name} {proof.profiles?.last_name}
                          </p>
                          {proof.profiles?.country_code && (
                            <img 
                              src={getCountryFlag(proof.profiles.country_code)} 
                              alt={proof.profiles.detected_country} 
                              className="w-4 h-3 rounded flex-shrink-0"
                            />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {proof.currency} {proof.amount?.toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
                        proof.status === "submitted" ? "bg-yellow-500/20 text-yellow-500" :
                        proof.status === "approved" ? "bg-green-500/20 text-green-500" :
                        "bg-red-500/20 text-red-500"
                      }`}>
                        {proof.status}
                      </span>
                    </div>
                  ))}
                  {paymentProofs.length === 0 && (
                    <p className="text-muted-foreground text-center py-4 text-sm">No payment proofs yet</p>
                  )}
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Upcoming Interviews</h3>
                <div className="space-y-2">
                  {interviews.filter(i => i.status === "scheduled").slice(0, 5).map((interview) => (
                    <div key={interview.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground text-sm truncate">
                            {interview.profiles?.first_name} {interview.profiles?.last_name}
                          </p>
                          {interview.profiles?.country_code && (
                            <img 
                              src={getCountryFlag(interview.profiles.country_code)} 
                              alt="" 
                              className="w-4 h-3 rounded flex-shrink-0"
                            />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(interview.scheduled_at).toLocaleString()}
                        </p>
                      </div>
                      <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                    </div>
                  ))}
                  {interviews.filter(i => i.status === "scheduled").length === 0 && (
                    <p className="text-muted-foreground text-center py-4 text-sm">No upcoming interviews</p>
                  )}
                </div>
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
                  <Card className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 w-full">
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

                      <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                        {proof.document_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingDocument(proof.document_id)}
                            className="flex-1 sm:flex-none"
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
                              className="flex-1 sm:flex-none"
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
                              className="flex-1 sm:flex-none"
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

          {/* Payouts Tab */}
          <TabsContent value="payouts">
            <PayoutsManagement />
          </TabsContent>

          {/* Interviews Tab */}
          <TabsContent value="interviews">
            <InterviewScheduling onRefresh={loadDashboardData} />
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
                  <Card className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
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
                        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleKYCAction(kyc.id, "approve")}
                            className="flex-1 sm:flex-none"
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
                            className="flex-1 sm:flex-none"
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

          {/* Activity Logs Tab */}
          <TabsContent value="activity">
            <ActivityLogsViewer />
          </TabsContent>

          {/* Support Chat Tab */}
          <TabsContent value="support">
            <SupportChatManagement />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <AdminSettings onSave={loadDashboardData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
