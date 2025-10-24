import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Chrome, Copy, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useReferral } from "@/hooks/useReferral";

const LoginPanel = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const { referralCode, hasDiscount, userReferralCode, processPayment, getReferralLink, getReferralStats } = useReferral();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        toast.success("Welcome back, Visionary. Your portfolio awaits.");
      }, 1500);
    } else {
      setShowPayment(true);
    }
  };

  const handlePayment = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const username = email.split('@')[0];
      processPayment(username);
      
      setIsLoading(false);
      setShowPayment(false);
      
      // DM to new user
      toast.success(
        hasDiscount 
          ? "Welcome! You saved ₦5,000 with your referral code! 🎉"
          : "Welcome to BlackPAL! Your account is now active.",
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
    }, 1500);
  };

  const handleGoogleSignIn = () => {
    toast.info("Google Sign-In integration ready. Connect OAuth to activate.");
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(getReferralLink());
    toast.success("Link copied! Share it and earn ₦5,000 per signup.");
  };

  const stats = getReferralStats();

  // Payment Screen
  if (showPayment) {
    const price = hasDiscount ? 20000 : 25000;
    const stars = hasDiscount ? 140 : 180;
    
    return (
      <motion.div
        className="w-full max-w-md mx-auto px-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div className="glass-panel rounded-2xl p-8 md:p-10">
          <div className="space-y-6">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center space-y-2"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gradient-gold">
                Complete Your Access
              </h2>
              <p className="text-muted-foreground">
                Join the elite traders' circle
              </p>
            </motion.div>

            {hasDiscount && (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center"
              >
                <p className="text-primary font-semibold">
                  🎉 Referral code applied!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  You're saving ₦5,000
                </p>
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="text-center py-8 bg-background/50 rounded-lg border border-accent/20">
                <div className="text-5xl font-bold text-accent mb-2">
                  ₦{price.toLocaleString()}
                </div>
                <div className="text-muted-foreground">
                  or {stars} Telegram Stars
                </div>
                {hasDiscount && (
                  <div className="text-sm text-muted-foreground mt-2 line-through opacity-60">
                    Original: ₦25,000
                  </div>
                )}
              </div>

              <Button
                onClick={handlePayment}
                disabled={isLoading}
                className="w-full py-6 text-lg"
                variant="premium"
              >
                {isLoading ? "Processing..." : "Confirm Payment"}
              </Button>

              <Button
                onClick={() => setShowPayment(false)}
                variant="outline"
                className="w-full py-6"
              >
                Back
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Login/Signup Screen
  return (
    <motion.div
      className="w-full max-w-md mx-auto px-4"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div
        className="glass-panel rounded-2xl p-8 md:p-10 relative overflow-hidden"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.3 }}
      >
        {/* Ambient Glow */}
        <motion.div
          className="absolute inset-0 opacity-30 pointer-events-none"
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, hsl(51 100% 50% / 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 50%, hsl(194 100% 50% / 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, hsl(51 100% 50% / 0.1) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        <div className="relative z-10">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-center mb-2 text-gradient-gold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isLogin ? "Access Your Portfolio" : "Create Your Legacy"}
          </motion.h2>
          
          <motion.p
            className="text-center text-muted-foreground mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {isLogin
              ? "Continue your journey in precision trading"
              : "Join the elite circle of visionaries"}
          </motion.p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label htmlFor="email" className="text-foreground">
                Email / Username
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11"
                  required
                />
              </div>
            </motion.div>

            {/* Password Input */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11"
                  required
                />
              </div>
            </motion.div>

            {/* Primary Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                type="submit"
                disabled={isLoading}
                variant="premium"
                className="w-full py-6 text-lg rounded-xl"
              >
                {isLoading
                  ? "Syncing data..."
                  : isLogin
                  ? "Enter the Arena"
                  : "Activate Account"}
              </Button>
            </motion.div>

            {/* Divider */}
            <motion.div
              className="relative my-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-accent/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">
                  or connect instantly
                </span>
              </div>
            </motion.div>

            {/* Google Sign-In */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                className="w-full border-accent/50 hover:bg-accent/10 hover:border-accent transition-all duration-300 py-6 text-lg rounded-xl"
              >
                <Chrome className="mr-3 h-5 w-5" />
                Continue with Google
              </Button>
            </motion.div>

            {/* Toggle Login/Signup */}
            <motion.div
              className="text-center pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-accent transition-colors duration-300"
              >
                {isLogin ? (
                  <>
                    New to BlackPAL?{" "}
                    <span className="text-accent font-semibold">Create Legacy</span>
                  </>
                ) : (
                  <>
                    Already have access?{" "}
                    <span className="text-accent font-semibold">Enter Arena</span>
                  </>
                )}
              </button>
            </motion.div>

            {/* Referral Section */}
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="mt-6 pt-6 border-t border-accent/20 space-y-3"
              >
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">Your referral code</p>
                  <p className="text-xl font-mono font-bold text-accent">{userReferralCode}</p>
                </div>
                
                <Button
                  type="button"
                  onClick={copyReferralLink}
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 border-accent/30"
                >
                  <Copy className="w-4 h-4" />
                  Share Your Link
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Earn ₦5,000 for each friend who joins
                </p>

                {stats.referrals.length > 0 && (
                  <div className="text-center py-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-center gap-2 text-primary mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-semibold text-sm">
                        {stats.referrals.length} referral{stats.referrals.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-accent font-bold text-lg">
                      ₦{stats.earnings.toLocaleString()} earned
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LoginPanel;
