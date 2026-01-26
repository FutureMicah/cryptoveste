import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  LogOut, Copy, ExternalLink, Users, DollarSign, 
  CheckCircle, XCircle, Share2, MessageCircle, Wallet,
  ArrowUpRight, RefreshCw, AlertCircle, Banknote, Building2, 
  User, Shield, Hash, Bell, BellOff
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import BankDetailsForm from "@/components/BankDetailsForm";
import SessionTimeoutWarning from "@/components/SessionTimeoutWarning";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import SupportChatWidget from "@/components/SupportChatWidget";
import usePushNotifications from "@/hooks/usePushNotifications";

const TELEGRAM_GROUP = "https://t.me/+J0p7oeR8r4k3Yjg0";
const TELEGRAM_CHANNEL = "https://t.me/BLACKTRADEACADEMYfreechannel";
const SUPPORT_USERNAME = "@Futuremicah";
const MIN_PAYOUT = 10000;

const UserDashboard = () => {
  const navigate = useNavigate();
  const { showWarning, remainingTime, stayLoggedIn, logout } = useSessionTimeout();
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
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [memberNumber, setMemberNumber] = useState<number | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Push notifications hook
  const { requestPermission } = usePushNotifications(user?.id || null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Check notification permission status
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const toggleNotifications = useCallback(async () => {
    if (notificationsEnabled) {
      toast.info("Notifications are enabled. To disable, adjust your browser settings.");
    } else {
      const granted = await requestPermission();
      setNotificationsEnabled(granted);
      if (granted) {
        toast.success("Push notifications enabled!");
      } else {
        toast.error("Please allow notifications in your browser settings.");
      }
    }
  }, [notificationsEnabled, requestPermission]);

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

      // Get member number (count of profiles created before this one)
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .lte("created_at", profileData?.created_at || new Date().toISOString());
      
      setMemberNumber(count || 1);

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
        .select("*")
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

    // Check if bank details are set
    if (!profile?.bank_account_name || !profile?.bank_account_number || !profile?.bank_name) {
      toast.error("Please add your bank details first");
      setShowBankDetails(true);
      setPayoutDialogOpen(false);
      return;
    }

    setPayoutProcessing(true);
    try {
      const { error: payoutError } = await supabase
        .from("payouts")
        .insert({
          user_id: user.id,
          amount: amount,
          status: "pending",
        });

      if (payoutError) throw payoutError;

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
    <>
      {/* Session Timeout Warning */}
      <SessionTimeoutWarning
        show={showWarning}
        remainingTime={remainingTime}
        onStayLoggedIn={stayLoggedIn}
        onLogout={logout}
      />

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

        {/* Bank Details Dialog */}
        <Dialog open={showBankDetails} onOpenChange={setShowBankDetails}>
          <DialogContent className="bg-card max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Bank Details
              </DialogTitle>
              <DialogDescription>
              Add your bank details to receive payouts
            </DialogDescription>
          </DialogHeader>
          <BankDetailsForm 
            userId={user?.id} 
            existingDetails={{
              bank_name: profile?.bank_name || null,
              bank_account_number: profile?.bank_account_number || null,
              bank_account_name: profile?.bank_account_name || null,
            }}
            onSaved={() => {
              setShowBankDetails(false);
              loadUserData(user.id);
            }}
          />
          </DialogContent>
        </Dialog>

        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Welcome, {profile?.first_name || "User"}! 👋
              </h1>
              <p className="text-sm text-muted-foreground">Your BlackPAL Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleNotifications}
                className={notificationsEnabled ? "text-green-500" : "text-muted-foreground"}
              >
                {notificationsEnabled ? (
                  <Bell className="w-4 h-4 mr-1" />
                ) : (
                  <BellOff className="w-4 h-4 mr-1" />
                )}
                <span className="hidden sm:inline">{notificationsEnabled ? "Notifications On" : "Enable Alerts"}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>

          {/* Member Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/50">
                  <span className="text-2xl font-bold text-primary">
                    {profile?.first_name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-foreground">
                      {profile?.first_name} {profile?.last_name}
                    </h2>
                    {hasCompletedPayment ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-medium">
                        <AlertCircle className="w-3 h-3" />
                        Pending Payment
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Hash className="w-4 h-4" />
                      Member #{memberNumber?.toString().padStart(4, "0")}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {user?.email}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Verification Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Card className={`p-6 ${hasCompletedPayment ? "bg-green-500/5 border-green-500/30" : "bg-yellow-500/5 border-yellow-500/30"}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hasCompletedPayment ? "bg-green-500/20" : "bg-yellow-500/20"}`}>
                  {hasCompletedPayment ? (
                    <Shield className="w-6 h-6 text-green-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">
                    {hasCompletedPayment ? "✅ Payment Verified" : "⏳ Verification Pending"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {hasCompletedPayment 
                      ? "Your payment has been verified. You have full access to all features."
                      : "Your payment is being verified. This usually takes 24-48 hours."}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Telegram Access - Only show if payment completed */}
          {hasCompletedPayment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <Card className="p-6 bg-gradient-to-r from-[#0088cc]/10 to-[#0088cc]/5 border-[#0088cc]/30">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#0088cc]" />
                  📱 Your Telegram Access
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <a
                    href={TELEGRAM_GROUP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-4 bg-[#0088cc] text-white rounded-xl hover:bg-[#0077b5] transition-colors font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    🔒 Private Trading Group
                  </a>
                  <a
                    href={TELEGRAM_CHANNEL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-4 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    📢 Free Channel
                  </a>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <p className="text-sm text-muted-foreground">
                    <strong>Support:</strong> Contact{" "}
                    <a 
                      href={`https://t.me/${SUPPORT_USERNAME.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0088cc] hover:underline font-medium"
                    >
                      {SUPPORT_USERNAME}
                    </a>
                    {" "}on Telegram for any issues
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-4 mb-6"
          >
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Referrals</p>
                  <p className="text-2xl font-bold text-foreground">{referrals.length}</p>
                  <p className="text-xs text-green-500">{completedReferrals} completed</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Earnings</p>
                  <p className="text-2xl font-bold text-green-500">
                    ₦{availableBalance.toLocaleString()}
                  </p>
                  {pendingPayouts > 0 && (
                    <p className="text-xs text-yellow-500">₦{pendingPayouts.toLocaleString()} pending</p>
                  )}
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </Card>
          </motion.div>

          {/* Referral Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Your Referral Link
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Share this link and earn <span className="text-green-500 font-bold">₦5,000</span> for every successful referral!
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-xs text-foreground truncate">
                  {`${window.location.origin}/signup?ref=${profile?.referral_code}`}
                </div>
                <Button onClick={copyReferralLink} className="shrink-0">
                  {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Payout Section */}
          {availableBalance >= MIN_PAYOUT && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6"
            >
              <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-green-500/20">
                      <Wallet className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Ready to Withdraw!</h3>
                      <p className="text-sm text-muted-foreground">
                        You have ₦{availableBalance.toLocaleString()} available
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

          {/* Bank Details Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Bank Details
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBankDetails(true)}
                >
                  {profile?.bank_account_name ? "Edit" : "Add"}
                </Button>
              </div>
              {profile?.bank_account_name ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank Name:</span>
                    <span className="font-medium text-foreground">{profile.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Number:</span>
                    <span className="font-medium text-foreground">{profile.bank_account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Name:</span>
                    <span className="font-medium text-foreground">{profile.bank_account_name}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add your bank details to receive payouts
                </p>
              )}
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 text-center text-xs text-muted-foreground"
          >
            <p>Need help? Contact <a href={`https://t.me/${SUPPORT_USERNAME.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{SUPPORT_USERNAME}</a></p>
          </motion.div>
        </div>
      </div>

      {/* Support Chat Widget */}
      <SupportChatWidget />
    </>
  );
};

export default UserDashboard;
