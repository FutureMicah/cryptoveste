import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Chrome, Copy, TrendingUp, Shield } from "lucide-react";
import { toast } from "sonner";
import { useReferral } from "@/hooks/useReferral";
import FloatingInput from "./FloatingInput";
import DynamicGreeting from "./DynamicGreeting";
import MotivationalQuotes from "./MotivationalQuotes";
import { usePaystackPayment } from "react-paystack";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Validation schemas
const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

const LoginPanel = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});
  const { referralCode, hasDiscount, userReferralCode, processPayment, getReferralLink, getReferralStats } = useReferral();

  const validateForm = (): boolean => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") errors.email = err.message;
        if (err.path[0] === "password") errors.password = err.message;
      });
      setValidationErrors(errors);
      return false;
    }
    setValidationErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (isLogin) {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password. Please try again.");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Please verify your email before logging in.");
          } else {
            toast.error(error.message);
          }
          return;
        }
        
        if (data.user) {
          toast.success("Access Granted. Welcome back, Ascendant.");
        }
      } catch (error: any) {
        toast.error("Login failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setShowPayment(true);
    }
  };

  const price = hasDiscount ? 20000 : 25000;
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";
  
  const paystackConfig = {
    reference: `BP_${new Date().getTime()}_${Math.random().toString(36).substring(7)}`,
    email: email,
    amount: price * 100, // Paystack expects amount in kobo
    publicKey: publicKey,
  };

  const onSuccess = () => {
    const username = email.split('@')[0];
    processPayment(username);
    
    setIsLoading(false);
    setShowPayment(false);
    
    // DM to new user
    toast.success(
      hasDiscount 
        ? "Welcome! You saved ₦5,000 with your referral code! 🎉"
        : "Payment successful! Welcome to BlackPAL Network.",
      { duration: 5000 }
    );

    // DM to referrer (simulated)
    if (hasDiscount && referralCode) {
      setTimeout(() => {
        toast.success(
          `You earned ₦5,000! User @${username} paid via your link.`,
          { duration: 5000 }
        );
      }, 1500);
    }
  };

  const onClose = () => {
    toast.error("Payment cancelled. Please try again.");
    setIsLoading(false);
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handlePayment = () => {
    if (!publicKey || publicKey === "your_paystack_public_key_here") {
      toast.error("Paystack not configured. Please add your public key.");
      return;
    }
    setIsLoading(true);
    initializePayment({ onSuccess, onClose });
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Google sign-in failed. Please try again.");
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(getReferralLink());
    toast.success("Link copied! Share the power.");
  };

  const stats = getReferralStats();

  // Payment Screen
  if (showPayment) {
    const stars = hasDiscount ? 140 : 180;
    
    return (
      <motion.div
        className="w-full max-w-lg mx-auto px-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div className="glass-card rounded-3xl p-8 md:p-10 relative overflow-hidden">
          {/* Animated Glow Background */}
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              background: [
                "radial-gradient(circle at 30% 50%, rgba(0,255,255,0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 70% 50%, rgba(255,215,0,0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 30% 50%, rgba(0,255,255,0.3) 0%, transparent 50%)",
              ],
            }}
            transition={{ duration: 5, repeat: Infinity }}
          />

          <div className="relative z-10 space-y-6">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center space-y-3"
            >
              <h2 className="text-3xl md:text-5xl font-bold text-gradient-cyan">
                Secure Network Access
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Join the elite traders' network
              </p>
            </motion.div>

            {hasDiscount && (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center cyan-glow"
              >
                <p className="text-accent font-bold text-lg">
                  🎉 Referral Code Applied!
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  You're saving ₦5,000
                </p>
              </motion.div>
            )}

            <motion.div className="text-center py-10 bg-background/30 rounded-2xl border border-accent/20 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 opacity-10"
                animate={{
                  background: [
                    "linear-gradient(0deg, transparent, rgba(0,255,255,0.3), transparent)",
                    "linear-gradient(180deg, transparent, rgba(0,255,255,0.3), transparent)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="relative z-10">
                <div className="text-6xl md:text-7xl font-bold text-gradient-cyan mb-3">
                  ₦{price.toLocaleString()}
                </div>
                <div className="text-muted-foreground text-lg">
                  {stars} Telegram Stars
                </div>
                {hasDiscount && (
                  <div className="text-sm text-muted-foreground mt-2 line-through opacity-60">
                    Original: ₦25,000 (180 Stars)
                  </div>
                )}
              </div>
            </motion.div>

            <Button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full py-7 text-lg metallic-gradient text-black font-bold ripple-button rounded-xl hover:scale-105 transition-all duration-300"
            >
              {isLoading ? (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Processing Payment...
                </motion.span>
              ) : (
                "Confirm Payment"
              )}
            </Button>

            <Button
              onClick={() => setShowPayment(false)}
              variant="outline"
              className="w-full py-6 rounded-xl border-white/20 hover:border-accent/50 transition-all duration-300"
            >
              Back
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
              <Shield className="w-4 h-4" />
              <span>Protected by BlackPAL Network</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Login/Signup Screen
  return (
    <motion.div
      className="w-full max-w-lg mx-auto px-4"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <motion.div
        className="glass-card rounded-3xl p-8 md:p-12 relative overflow-hidden"
        style={{
          boxShadow: "0 0 60px rgba(0,255,255,0.15), 0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Mouse-Follow Reflection Effect */}
        <motion.div
          className="absolute inset-0 opacity-10 pointer-events-none"
          animate={{
            background: [
              "radial-gradient(circle at 20% 30%, rgba(0,255,255,0.4) 0%, transparent 40%)",
              "radial-gradient(circle at 80% 70%, rgba(255,215,0,0.4) 0%, transparent 40%)",
              "radial-gradient(circle at 20% 30%, rgba(0,255,255,0.4) 0%, transparent 40%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 space-y-6">
          {/* Dynamic Greeting */}
          <div className="text-center mb-6">
            <DynamicGreeting />
            <motion.p
              className="text-muted-foreground text-sm md:text-base mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {isLogin ? "Welcome back, Ascendant" : "Join the Elite Circle"}
            </motion.p>
          </div>

          {/* Motivational Quotes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <MotivationalQuotes />
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Floating Email Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <FloatingInput
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} />}
                required
              />
            </motion.div>

            {/* Floating Password Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <FloatingInput
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={18} />}
                required
              />
            </motion.div>

            {/* Primary Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="pt-2"
            >
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-7 text-lg metallic-gradient text-black font-bold ripple-button rounded-xl hover:scale-105 transition-all duration-300 shadow-lg"
              >
                {isLoading ? (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Accessing Secure Network...
                  </motion.span>
                ) : isLogin ? (
                  "Login Securely"
                ) : (
                  "Create Account"
                )}
              </Button>
            </motion.div>

            {/* Security Badge */}
            <motion.div
              className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <Shield className="w-3 h-3" />
              <span>Protected by BlackPAL Network</span>
            </motion.div>

            {/* Divider */}
            <motion.div
              className="relative my-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-accent/20"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-background text-muted-foreground uppercase tracking-wider">
                  or continue with
                </span>
              </div>
            </motion.div>

            {/* Google Sign-In */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                className="w-full border-white/20 hover:border-accent/50 hover:bg-accent/5 transition-all duration-300 py-6 text-base rounded-xl"
              >
                <Chrome className="mr-3 h-5 w-5" />
                Continue with Google
              </Button>
            </motion.div>

            {/* Toggle Login/Signup */}
            <motion.div
              className="text-center pt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-accent transition-colors duration-300 underline-offset-4 hover:underline"
              >
                {isLogin ? (
                  <>
                    New to BlackPAL?{" "}
                    <span className="text-accent font-bold">Create Legacy →</span>
                  </>
                ) : (
                  <>
                    Already Ascended?{" "}
                    <span className="text-accent font-bold">Sign In →</span>
                  </>
                )}
              </button>
            </motion.div>

            {/* Referral Section */}
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 }}
                className="mt-8 pt-8 border-t border-accent/20 space-y-4"
              >
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Your Referral Code
                  </p>
                  <motion.p
                    className="text-2xl font-mono font-bold text-gradient-cyan"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {userReferralCode}
                  </motion.p>
                </div>
                
                <Button
                  type="button"
                  onClick={copyReferralLink}
                  variant="outline"
                  className="w-full gap-2 border-accent/30 hover:border-accent/50 py-5 rounded-xl"
                >
                  <Copy className="w-4 h-4" />
                  Copy Referral Link
                </Button>

                <p className="text-xs text-center text-muted-foreground italic">
                  Earn ₦5,000 for each successful referral
                </p>

                {stats.referrals.length > 0 && (
                  <motion.div
                    className="text-center py-4 bg-accent/5 rounded-xl border border-accent/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-center gap-2 text-accent mb-2">
                      <TrendingUp className="w-5 h-5" />
                      <span className="font-bold text-sm">
                        {stats.referrals.length} Referral{stats.referrals.length > 1 ? 's' : ''} Active
                      </span>
                    </div>
                    <div className="text-gradient-cyan font-bold text-2xl">
                      ₦{stats.earnings.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Total Earned</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </form>
        </div>
      </motion.div>

      {/* Footer Badge */}
      <motion.div
        className="text-center mt-6 text-xs text-muted-foreground opacity-60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 1.4 }}
      >
        Power isn't given — it's logged in.
      </motion.div>
    </motion.div>
  );
};

export default LoginPanel;
