import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LogOut, Copy, Check, ExternalLink, Users, DollarSign, 
  Clock, CheckCircle, XCircle, Share2, MessageCircle 
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const TELEGRAM_GROUP = "https://t.me/+J0p7oeR8r4k3Yjg0";
const TELEGRAM_CHANNEL = "https://t.me/BLACKTRADEACADEMYfreechannel";
const SUPPORT_USERNAME = "@Futuremicah";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
    } catch (error) {
      console.error("Error loading user data:", error);
    }
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

  const hasCompletedPayment = payments.some(p => p.status === "completed");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, {profile?.first_name || "User"}!
            </h1>
            <p className="text-muted-foreground">Manage your account and referrals</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Referrals</p>
                <p className="text-3xl font-bold text-foreground">{referrals.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-foreground">
                  ₦{(profile?.total_earnings || 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Account Status</p>
                <p className={`text-lg font-bold ${hasCompletedPayment ? "text-green-500" : "text-yellow-500"}`}>
                  {hasCompletedPayment ? "Active" : "Pending Payment"}
                </p>
              </div>
              {hasCompletedPayment ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <Clock className="w-8 h-8 text-yellow-500" />
              )}
            </div>
          </Card>
        </div>

        {/* Telegram Access - Only show if payment completed */}
        {hasCompletedPayment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Your Telegram Access
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href={TELEGRAM_GROUP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-4 bg-[#0088cc] text-white rounded-lg hover:bg-[#0077b5] transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Private Trading Group
                </a>
                <a
                  href={TELEGRAM_CHANNEL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-4 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Free Channel
                </a>
                <a
                  href={`https://t.me/${SUPPORT_USERNAME.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-4 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Contact Support
                </a>
              </div>
            </Card>
          </motion.div>
        )}

        <Tabs defaultValue="referrals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="referrals">
              <Share2 className="w-4 h-4 mr-2" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="payments">
              <DollarSign className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
          </TabsList>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-4">
            {/* Referral Link */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Your Referral Link</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Share this link and earn ₦5,000 for every successful referral!
              </p>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm text-foreground truncate">
                  {`${window.location.origin}/signup?ref=${profile?.referral_code}`}
                </div>
                <Button onClick={copyReferralLink}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Your referral code: <span className="font-mono font-bold">{profile?.referral_code}</span>
              </p>
            </Card>

            {/* Referral History */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Referral History</h3>
              {referrals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No referrals yet. Share your link to start earning!
                </p>
              ) : (
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {referral.referee?.first_name} {referral.referee?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-500">+₦{referral.amount?.toLocaleString()}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          referral.status === "completed" 
                            ? "bg-green-500/20 text-green-500"
                            : "bg-yellow-500/20 text-yellow-500"
                        }`}>
                          {referral.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            {payments.length === 0 ? (
              <Card className="p-8 text-center">
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
                  <Card className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {payment.payment_type.replace(/_/g, " ").toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
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
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        ) : payment.status === "pending" ? (
                          <Clock className="w-8 h-8 text-yellow-500" />
                        ) : (
                          <XCircle className="w-8 h-8 text-red-500" />
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
