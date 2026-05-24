import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import DepositPanel from "@/components/invest/DepositPanel";
import { CardSkeleton } from "@/components/EmptyState";
import { useEffect } from "react";

const DepositPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    document.title = "Deposit — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <AppShell title="Deposit" back>
        <div className="space-y-3"><CardSkeleton height="h-32" /><CardSkeleton height="h-60" /></div>
      </AppShell>
    );
  }
  if (!user) return null;

  return (
    <AppShell title="Deposit" back>
      <DepositPanel userId={user.id} />
    </AppShell>
  );
};

export default DepositPage;
