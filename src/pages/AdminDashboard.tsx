import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, LogOut, Zap } from "lucide-react";
import AdminOverview from "@/components/admin/AdminOverview";
import PlansManager from "@/components/admin/PlansManager";
import DepositsApproval from "@/components/admin/DepositsApproval";
import WithdrawalsApproval from "@/components/admin/WithdrawalsApproval";
import InvestmentsManager from "@/components/admin/InvestmentsManager";
import AnalyticsPanel from "@/components/admin/AnalyticsPanel";

const ADMIN_EMAIL = "futuremicah4@gmail.com";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    document.title = "Admin — CryptoVest";
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { setChecking(false); return; }
    (async () => {
      // Auto-grant super_admin to the configured admin email
      if (user.email === ADMIN_EMAIL) {
        await supabase.from("user_roles").upsert({ user_id: user.id, role: "super_admin" }, { onConflict: "user_id,role" });
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = (data ?? []).map((r) => r.role);
      setIsAdmin(roles.includes("admin") || roles.includes("super_admin"));
      setChecking(false);
    })();
  }, [user, loading]);

  if (loading || checking) return null;

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <Shield className="w-12 h-12 text-primary mx-auto" />
          <h1 className="text-xl font-bold">Admin Access</h1>
          <p className="text-sm text-muted-foreground">Sign in with the admin account to continue.</p>
          <Button onClick={() => navigate("/auth")} className="w-full">Sign in</Button>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <Shield className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Not authorized</h1>
          <p className="text-sm text-muted-foreground">Your account does not have admin access.</p>
          <Button onClick={() => navigate("/dashboard")} variant="outline" className="w-full">Go to dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Zap className="w-4 h-4" />
            </span>
            CryptoVest <span className="text-xs text-muted-foreground ml-1">Admin</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
        <AdminOverview />

        <Tabs defaultValue="deposits">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="investments">Investments</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="deposits" className="mt-6"><DepositsApproval /></TabsContent>
          <TabsContent value="withdrawals" className="mt-6"><WithdrawalsApproval /></TabsContent>
          <TabsContent value="investments" className="mt-6"><InvestmentsManager /></TabsContent>
          <TabsContent value="plans" className="mt-6"><PlansManager /></TabsContent>
          <TabsContent value="analytics" className="mt-6"><AnalyticsPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
