import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import AppShell from "@/components/AppShell";
import InvestPanel from "@/components/invest/InvestPanel";
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
      <InvestPanel userId={user.id} balance={wallet?.balance_usd ?? 0} />
    </AppShell>
  );
};

export default InvestPage;
