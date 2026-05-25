import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import WithdrawPanel from "@/components/invest/WithdrawPanel";
import EmptyState, { CardSkeleton } from "@/components/EmptyState";
import { useEffect, useState } from "react";
import { WalletMinimal, ArrowDownToLine, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const WithdrawPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { wallet, loading: walletLoading } = useWallet(user?.id);
  const [kyc, setKyc] = useState<{ status: string } | null | undefined>(undefined);

  useEffect(() => {
    document.title = "Withdraw — CryptoVest";
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_kyc").select("status").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setKyc(data as any ?? null));
  }, [user]);

  if (loading || !user) return null;

  const balance = wallet?.balance_usd ?? 0;
  const kycApproved = kyc?.status === "approved";

  return (
    <AppShell title="Withdraw" back>
      {walletLoading || kyc === undefined ? (
        <div className="space-y-3"><CardSkeleton height="h-28" /><CardSkeleton height="h-48" /></div>
      ) : !kycApproved ? (
        <Card className="p-5 rounded-2xl bg-yellow-500/10 border-yellow-500/40 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">KYC required</p>
              <p className="text-xs text-muted-foreground mt-1">
                {kyc?.status === "pending"
                  ? "Your KYC is under review. Withdrawals unlock once approved."
                  : kyc?.status === "rejected"
                  ? "Your KYC was rejected. Please update and resubmit."
                  : "Complete identity verification to enable withdrawals."}
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/kyc")} className="w-full rounded-full gradient-lime border-0 text-primary-foreground">
            {kyc?.status === "pending" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Awaiting review</> : "Go to KYC"}
          </Button>
        </Card>
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
