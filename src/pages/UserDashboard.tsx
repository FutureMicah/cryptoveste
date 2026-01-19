import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  LogOut, Copy, Check, ExternalLink, Users, DollarSign, 
  Clock, CheckCircle, XCircle, Share2, MessageCircle, Wallet,
  ArrowUpRight, RefreshCw, AlertCircle, Banknote, Building2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import BankDetailsForm from "@/components/BankDetailsForm";

const TELEGRAM_GROUP = "https://t.me/+J0p7oeR8r4k3Yjg0";
const TELEGRAM_CHANNEL = "https://t.me/BLACKTRADEACADEMYfreechannel";
const SUPPORT_USERNAME = "@Futuremicah";
const MIN_PAYOUT = 10000; // Minimum ₦10,000 for payout

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutProcessing, setPayoutProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/");
      return;
    }
    setUser(user);
    await loadUserData(user.id);
    setLoading(false);
  };

  const loadUserData = async (userId: string) => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      setProfile(profileData);

      // Load payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      setPayments(paymentsData || []);

      // Load referrals where user is the referrer
      const { data: referralsData } = await supabase
        .from("referrals")
        .select(`
          *,
          referee:referee_id (first_name, last_name)
        `)
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false });
      
      setReferrals(referralsData || []);

      // Load payouts
      const { data: payoutsData } = await supabase
        .from("payouts")
        .select("*")
        .eq("user_id", userId)
        .order("requested_at", { ascending: false });
      
      setPayouts(payoutsData || []);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await loadUserData(user.id);
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/signup?ref=${profile?.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayoutRequest = async () => {
    const amount = parseFloat(payoutAmount);
    
    if (isNaN(amount) || amount < MIN_PAYOUT) {
      toast.error(`Minimum payout is ₦${MIN_PAYOUT.toLocaleString()}`);
      return;
    }

    if (amount > (profile?.total_earnings || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    setPayoutProcessing(true);
    try {
      // Create payout request
      const { error: payoutError } = await supabase
        .from("payouts")
        .insert({
          user_id: user.id,
          amount: amount,
          status: "pending",
        });

      if (payoutError) throw payoutError;

      // Deduct from user's earnings (will be restored if rejected)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          total_earnings: (profile?.total_earnings || 0) - amount 
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      toast.success("Payout request submitted!", {
        description: "You'll receive your funds within 24-48 hours.",
      });

      setPayoutDialogOpen(false);
      setPayoutAmount("");
      await loadUserData(user.id);
    } catch (error: any) {
      console.error("Payout error:", error);
      toast.error(error.message || "Failed to submit payout request");
    } finally {
      setPayoutProcessing(false);
    }
  };

  const hasCompletedPayment = payments.some(p => p.status === "completed");
  const availableBalance = profile?.total_earnings || 0;
  const pendingPayouts = payouts.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0);
  const completedReferrals = referrals.filter(r => r.status === "completed").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Payout Request Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Request Payout
            </DialogTitle>
            <DialogDescription>
              Enter the amount you'd like to withdraw from your earnings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-green-500">₦{availableBalance.toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payout Amount (₦)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₦</span>
                <Input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder={MIN_PAYOUT.toLocaleString()}
                  className="pl-8"
                  min={MIN_PAYOUT}
                  max={availableBalance}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum payout: ₦{MIN_PAYOUT.toLocaleString()}
              </p>
            </div>

            {parseFloat(payoutAmount) > availableBalance && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                Insufficient balance
              </div>
            )}

            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-xs text-yellow-500">
                <strong>Note:</strong> Payouts are processed within 24-48 hours to your registered bank account.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePayoutRequest}
              disabled={
                payoutProcessing || 
                parseFloat(payoutAmount) < MIN_PAYOUT || 
                parseFloat(payoutAmount) > availableBalance
              }
            >
              {payoutProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Request Payout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome, {profile?.first_name || "User"}!
            </h1>
            <p className="text-sm text-muted-foreground">Manage your account, referrals, and earnings</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Referrals</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground">{referrals.length}</p>
                <p className="text-xs text-green-500">{completedReferrals} completed</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          </Card>
          
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Available Balance</p>
                <p className="text-xl sm:text-3xl font-bold text-green-500">
                  ₦{availableBalance.toLocaleString()}
                </p>
                {pendingPayouts > 0 && (
                  <p className="text-xs text-yellow-500">₦{pendingPayouts.toLocaleString()} pending</p>
                )}
              </div>
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Per Referral</p>
                <p className="text-xl sm:text-3xl font-bold text-primary">₦5,000</p>
                <p className="text-xs text-muted-foreground">Commission</p>
              </div>
              <Banknote className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          </Card>
          
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Account Status</p>
                <p className={`text-sm sm:text-lg font-bold ${hasCompletedPayment ? "text-green-500" : "text-yellow-500"}`}>
                  {hasCompletedPayment ? "Active" : "Pending"}
                </p>
              </div>
              {hasCompletedPayment ? (
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              ) : (
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
              )}
            </div>
          </Card>
        </div>

        {/* Payout CTA */}
        {availableBalance >= MIN_PAYOUT && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-green-500/20">
                    <Wallet className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Ready to Withdraw!</h3>
                    <p className="text-sm text-muted-foreground">
                      You have ₦{availableBalance.toLocaleString()} available for payout
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setPayoutDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Request Payout
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Telegram Access - Only show if payment completed */}
        {hasCompletedPayment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Your Telegram Access
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href={TELEGRAM_GROUP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 sm:p-4 bg-[#0088cc] text-white rounded-lg hover:bg-[#0077b5] transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Private Trading Group
                </a>
                <a
                  href={TELEGRAM_CHANNEL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 sm:p-4 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Free Channel
                </a>
                <a
                  href={`https://t.me/${SUPPORT_USERNAME.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 sm:p-4 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Contact Support
                </a>
              </div>
            </Card>
          </motion.div>
        )}

        <Tabs defaultValue="referrals" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="referrals" className="text-xs sm:text-sm">
              <Share2 className="w-4 h-4 mr-1 hidden sm:inline" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="bank" className="text-xs sm:text-sm">
              <Building2 className="w-4 h-4 mr-1 hidden sm:inline" />
              Bank
            </TabsTrigger>
            <TabsTrigger value="payouts" className="text-xs sm:text-sm">
              <Wallet className="w-4 h-4 mr-1 hidden sm:inline" />
              Payouts
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm">
              <DollarSign className="w-4 h-4 mr-1 hidden sm:inline" />
              Payments
            </TabsTrigger>
          </TabsList>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-4">
            {/* Referral Link */}
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg font-bold text-foreground mb-2">Your Referral Link</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Share this link and earn <span className="text-green-500 font-bold">₦5,000</span> for every successful referral!
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-xs sm:text-sm text-foreground truncate">
                  {`${window.location.origin}/signup?ref=${profile?.referral_code}`}
                </div>
                <Button onClick={copyReferralLink} className="shrink-0">
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Your referral code: <span className="font-mono font-bold text-primary">{profile?.referral_code}</span>
              </p>
            </Card>

            {/* Referral History */}
            <Card className="p-4 sm:p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">
                Referral History ({referrals.length})
              </h3>
              {referrals.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">No referrals yet</p>
                  <p className="text-sm text-muted-foreground">Share your link to start earning!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <motion.div
                      key={referral.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 sm:p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                          referral.status === "completed" 
                            ? "bg-green-500/20 text-green-500" 
                            : "bg-yellow-500/20 text-yellow-500"
                        }`}>
                          {referral.referee?.first_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {referral.referee?.first_name} {referral.referee?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(referral.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${referral.status === "completed" ? "text-green-500" : "text-yellow-500"}`}>
                          {referral.status === "completed" ? "+₦5,000" : "Pending"}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          referral.status === "completed" 
                            ? "bg-green-500/20 text-green-500"
                            : "bg-yellow-500/20 text-yellow-500"
                        }`}>
                          {referral.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Bank Details Tab */}
          <TabsContent value="bank" className="space-y-4">
            <BankDetailsForm 
              userId={user?.id || ""} 
              existingDetails={{
                bank_name: profile?.bank_name,
                bank_account_number: profile?.bank_account_number,
                bank_account_name: profile?.bank_account_name,
              }}
              onSaved={() => loadUserData(user?.id)}
            />
            
            {!profile?.bank_name && (
              <Card className="p-4 bg-yellow-500/10 border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-500">Bank Details Required</p>
                    <p className="text-sm text-muted-foreground">
                      Add your bank account to receive your referral earnings when you request a payout.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="payouts" className="space-y-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Payout History</h3>
                <Button 
                  size="sm" 
                  onClick={() => setPayoutDialogOpen(true)}
                  disabled={availableBalance < MIN_PAYOUT}
                >
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  New Payout
                </Button>
              </div>

              {payouts.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">No payouts yet</p>
                  <p className="text-sm text-muted-foreground">
                    {availableBalance >= MIN_PAYOUT 
                      ? "Request your first payout above!"
                      : `Earn at least ₦${MIN_PAYOUT.toLocaleString()} to request a payout`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <motion.div
                      key={payout.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 sm:p-4 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-bold text-foreground">₦{payout.amount?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payout.requested_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          payout.status === "completed" 
                            ? "bg-green-500/20 text-green-500"
                            : payout.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-red-500/20 text-red-500"
                        }`}>
                          {payout.status === "completed" ? "Paid" : payout.status === "pending" ? "Processing" : "Declined"}
                        </span>
                        {payout.status === "completed" && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {payout.status === "pending" && <Clock className="w-4 h-4 text-yellow-500" />}
                        {payout.status === "rejected" && <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            {payments.length === 0 ? (
              <Card className="p-8 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No payments yet</p>
                <Button onClick={() => navigate("/signup")}>
                  Complete Registration
                </Button>
              </Card>
            ) : (
              payments.map((payment) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-sm">
                            {payment.payment_type.replace(/_/g, " ").toUpperCase()}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            payment.status === "completed" 
                              ? "bg-green-500/20 text-green-500"
                              : payment.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-500"
                              : "bg-red-500/20 text-red-500"
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {payment.currency} {payment.amount?.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        {payment.status === "completed" ? (
                          <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                        ) : payment.status === "pending" ? (
                          <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
                        ) : (
                          <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
                        )}
                      </div>
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

export default UserDashboard;
