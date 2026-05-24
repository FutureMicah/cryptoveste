import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import AppShell from "@/components/AppShell";
import WithdrawPanel from "@/components/invest/WithdrawPanel";
import EmptyState, { CardSkeleton } from "@/components/EmptyState";
import { useEffect } from "react";
import { WalletMinimal, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";

const WithdrawPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wallet, loading: walletLoading } = useWallet(user?.id);

  useEffect(() => {
    document.title = "Withdraw — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  const balance = wallet?.balance_usd ?? 0;

  return (
    <AppShell title="Withdraw" back>
      {walletLoading ? (
        <div className="space-y-3"><CardSkeleton height="h-28" /><CardSkeleton height="h-48" /></div>
      ) : balance <= 0 ? (
        <EmptyState
          icon={WalletMinimal}
          title="Nothing to withdraw yet"
          description="Your wallet balance is $0.00. Make a deposit or earn ROI from an active plan first."
          tone="lime"
          action={
            <Button onClick={() => navigate("/deposit")} className="rounded-full gradient-lime text-primary-foreground border-0">
              <ArrowDownToLine className="w-4 h-4 mr-2" /> Deposit funds
            </Button>
          }
        />
      ) : (
        <WithdrawPanel userId={user.id} balance={balance} />
      )}
    </AppShell>
  );
};

export default WithdrawPage;
