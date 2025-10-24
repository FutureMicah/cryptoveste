import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Chrome } from "lucide-react";
import { toast } from "sonner";

const LoginPanel = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate authentication
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Welcome back, Visionary. Your portfolio awaits.", {
        duration: 3000,
      });
    }, 1500);
  };

  const handleGoogleSignIn = () => {
    toast.info("Google Sign-In integration ready. Connect OAuth to activate.", {
      duration: 3000,
    });
  };

  return (
    <motion.div
      className="w-full max-w-md mx-auto px-4"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Glass Panel */}
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

        {/* Content */}
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
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LoginPanel;
