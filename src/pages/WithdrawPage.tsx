import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import AppShell from "@/components/AppShell";
import WithdrawPanel from "@/components/invest/WithdrawPanel";
import { useEffect } from "react";

const WithdrawPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wallet } = useWallet(user?.id);

  useEffect(() => {
    document.title = "Withdraw — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  return (
    <AppShell title="Withdraw" back>
      <WithdrawPanel userId={user.id} balance={wallet?.balance_usd ?? 0} />
    </AppShell>
  );
};

export default WithdrawPage;
