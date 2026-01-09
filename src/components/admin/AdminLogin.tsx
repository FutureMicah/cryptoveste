import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AdminLoginProps {
  onSuccess: () => void;
}

// Hardcoded admin credentials as specified
const ADMIN_EMAIL = "futuremicah4@gmail.com";
const ADMIN_PIN = "4303";

const AdminLogin = ({ onSuccess }: AdminLoginProps) => {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate slight delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (email === ADMIN_EMAIL && pin === ADMIN_PIN) {
      // Store admin session
      sessionStorage.setItem("adminAuth", "true");
      sessionStorage.setItem("adminEmail", email);
      toast.success("Welcome, Admin!");
      onSuccess();
    } else {
      toast.error("Invalid credentials", {
        description: "Please check your email and PIN",
      });
    }

    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen flex items-center justify-center bg-background p-4"
    >
      <div className="w-full max-w-md">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="glass-card rounded-2xl p-8 border border-border/50"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Shield className="w-8 h-8 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Admin Access</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access the admin panel
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Admin Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                PIN Code
              </label>
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  required
                  maxLength={4}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-lg font-semibold"
            >
              {loading ? "Authenticating..." : "Access Admin Panel"}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            🔒 Secure admin access only
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AdminLogin;
