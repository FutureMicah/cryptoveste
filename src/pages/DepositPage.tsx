import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import DepositPanel from "@/components/invest/DepositPanel";
import { useEffect } from "react";

const DepositPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    document.title = "Deposit — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  return (
    <AppShell title="Deposit" back>
      <DepositPanel userId={user.id} />
    </AppShell>
  );
};

export default DepositPage;
