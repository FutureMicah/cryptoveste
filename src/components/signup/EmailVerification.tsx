import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, RefreshCw, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
  onResendEmail: () => void;
}

const EmailVerification = ({ email, onVerified, onResendEmail }: EmailVerificationProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  useEffect(() => {
    // Set up auth state listener for email confirmation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          toast.success("Email verified successfully!");
          onVerified();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [onVerified]);

  const checkVerification = async () => {
    setIsChecking(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session?.user?.email_confirmed_at) {
        toast.success("Email verified! Proceeding to payment...");
        onVerified();
      } else {
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) throw refreshError;
        
        if (refreshData?.user?.email_confirmed_at) {
          toast.success("Email verified! Proceeding to payment...");
          onVerified();
        } else {
          toast.error("Email not verified yet. Please check your inbox and click the verification link.");
        }
      }
    } catch (error: any) {
      console.error("Verification check error:", error);
      toast.error("Failed to check verification status");
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/signup`,
        }
      });
      
      if (error) throw error;
      
      toast.success("Verification email resent! Check your inbox.");
      setCountdown(60);
      setCanResend(false);
    } catch (error: any) {
      console.error("Resend error:", error);
      toast.error(error.message || "Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-lg mx-auto px-4"
    >
      <div className="glass-card rounded-3xl p-8 md:p-10 text-center">
        {/* Email Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6"
        >
          <Mail className="w-12 h-12 text-primary" />
        </motion.div>

        {/* Header */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl md:text-3xl font-bold text-foreground mb-3"
        >
          Verify Your Email
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground mb-6"
        >
          We've sent a verification link to:
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-semibold text-primary mb-8 break-all"
        >
          {email}
        </motion.p>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-muted/30 rounded-xl p-4 mb-6 text-left"
        >
          <p className="text-sm text-muted-foreground mb-3 font-medium">Steps to verify:</p>
          <ol className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              Check your email inbox (and spam folder)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              Click the verification link in the email
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              Return here and click "Check Verification"
            </li>
          </ol>
        </motion.div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={checkVerification}
            disabled={isChecking}
            className="w-full h-12 text-base font-semibold gap-2"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Check Verification
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleResend}
            disabled={!canResend || isResending}
            className="w-full h-12"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Sending...
              </>
            ) : canResend ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend Verification Email
              </>
            ) : (
              `Resend in ${countdown}s`
            )}
          </Button>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xs text-muted-foreground mt-6"
        >
          🔒 Secure email verification protects your account
        </motion.p>
      </div>
    </motion.div>
  );
};

export default EmailVerification;
