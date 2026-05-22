import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Zap, LogOut } from "lucide-react";
import WalletSummary from "@/components/invest/WalletSummary";
import PriceTicker from "@/components/invest/PriceTicker";
import InvestPanel from "@/components/invest/InvestPanel";
import DepositPanel from "@/components/invest/DepositPanel";
import WithdrawPanel from "@/components/invest/WithdrawPanel";
import ActiveInvestments from "@/components/invest/ActiveInvestments";
import HistoryTable from "@/components/invest/HistoryTable";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { wallet, refresh } = useWallet(user?.id);

  useEffect(() => {
    document.title = "Dashboard — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  if (loading || !user) return null;
  const balance = wallet?.balance_usd ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Zap className="w-4 h-4" />
            </span>
            CryptoVest
          </Link>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <WalletSummary wallet={wallet} />

        <PriceTicker />

        <Tabs defaultValue="invest" className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full sm:w-auto">
            <TabsTrigger value="invest">Invest</TabsTrigger>
            <TabsTrigger value="active">My Investments</TabsTrigger>
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="invest" className="mt-6">
            <InvestPanel userId={user.id} balance={balance} onDone={refresh} />
          </TabsContent>
          <TabsContent value="active" className="mt-6">
            <ActiveInvestments userId={user.id} />
          </TabsContent>
          <TabsContent value="deposit" className="mt-6">
            <DepositPanel userId={user.id} onDone={refresh} />
          </TabsContent>
          <TabsContent value="withdraw" className="mt-6">
            <WithdrawPanel userId={user.id} balance={balance} onDone={refresh} />
          </TabsContent>
          <TabsContent value="history" className="mt-6">
            <HistoryTable userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
