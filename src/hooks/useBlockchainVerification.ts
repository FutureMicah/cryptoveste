import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VerificationStatus {
  status: "pending" | "verifying" | "confirmed" | "failed";
  confirmations: number;
  requiredConfirmations: number;
  verified: boolean;
}

const REQUIRED_CONFIRMATIONS: Record<string, number> = {
  BTC: 3,
  ETH: 12,
  USDT_TRC20: 19,
  USDT_ERC20: 12,
  USDC: 12,
};

export const useBlockchainVerification = (cryptoPaymentId: string | null) => {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    status: "pending",
    confirmations: 0,
    requiredConfirmations: 6,
    verified: false,
  });

  const verifyTransaction = useCallback(async () => {
    if (!cryptoPaymentId) return;

    setVerificationStatus((prev) => ({ ...prev, status: "verifying" }));

    try {
      const { data, error } = await supabase.functions.invoke("verify-blockchain", {
        body: { cryptoPaymentId },
      });

      if (error) throw error;

      setVerificationStatus({
        status: data.verified ? "confirmed" : "pending",
        confirmations: data.confirmations || 0,
        requiredConfirmations: REQUIRED_CONFIRMATIONS.ETH,
        verified: data.verified,
      });

      return data;
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationStatus((prev) => ({ ...prev, status: "failed" }));
      return null;
    }
  }, [cryptoPaymentId]);

  // Poll for verification status
  useEffect(() => {
    if (!cryptoPaymentId || verificationStatus.verified) return;

    // Initial check
    verifyTransaction();

    // Poll every 30 seconds
    const interval = setInterval(() => {
      if (!verificationStatus.verified) {
        verifyTransaction();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [cryptoPaymentId, verifyTransaction, verificationStatus.verified]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!cryptoPaymentId) return;

    const channel = supabase
      .channel(`crypto-payment-${cryptoPaymentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "crypto_payments",
          filter: `id=eq.${cryptoPaymentId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setVerificationStatus({
            status: newData.status === "confirmed" ? "confirmed" : "pending",
            confirmations: newData.confirmations || 0,
            requiredConfirmations: REQUIRED_CONFIRMATIONS[newData.cryptocurrency] || 6,
            verified: newData.status === "confirmed",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cryptoPaymentId]);

  return {
    ...verificationStatus,
    verifyTransaction,
  };
};

export default useBlockchainVerification;