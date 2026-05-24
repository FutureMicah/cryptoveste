import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import AppShell from "@/components/AppShell";
import InvestPanel from "@/components/invest/InvestPanel";
import RoiBreakdown from "@/components/invest/RoiBreakdown";
import { useEffect } from "react";

const InvestPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wallet } = useWallet(user?.id);

  useEffect(() => {
    document.title = "Invest — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  return (
    <AppShell title="Invest" back>
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase text-muted-foreground font-semibold mb-2 px-1">Your active plans</p>
          <RoiBreakdown userId={user.id} />
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground font-semibold mb-2 px-1">Start a new plan</p>
          <InvestPanel userId={user.id} balance={wallet?.balance_usd ?? 0} />
        </div>
      </div>
    </AppShell>
  );
};

export default InvestPage;
