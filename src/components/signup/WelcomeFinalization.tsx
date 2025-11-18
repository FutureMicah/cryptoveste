import { motion } from "framer-motion";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface WelcomeFinalizationProps {
  userData: any;
}

const WelcomeFinalization = ({ userData }: WelcomeFinalizationProps) => {
  const navigate = useNavigate();
  const userName = userData?.formData?.fullName?.split(" ")[0] || "Ascendant";

  useEffect(() => {
    // Auto-generate user profile elements
    // This would integrate with your backend to create:
    // - Default avatar
    // - Level 1 status
    // - Starter XP
    // - Base tier citizenship
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black flex items-center justify-center z-50"
    >
      <div className="relative max-w-2xl mx-auto px-4 text-center">
        {/* Animated Background Fog */}
        <motion.div
          className="absolute inset-0 -z-10"
          animate={{
            background: [
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)",
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Initials Animation */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <motion.div
            className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-primary/50"
            animate={{
              boxShadow: [
                "0 0 20px rgba(255,255,255,0.2)",
                "0 0 40px rgba(255,255,255,0.4)",
                "0 0 20px rgba(255,255,255,0.2)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-5xl font-bold text-foreground">
              {userName.charAt(0).toUpperCase()}
            </span>
          </motion.div>
        </motion.div>

        {/* Welcome Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Welcome, {userName}
          </h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-lg text-muted-foreground mb-2"
          >
            Generating your Black ID...
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="space-y-2 mb-8"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ●
              </motion.span>
              <span>Level 1 Status Assigned</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              >
                ●
              </motion.span>
              <span>Base Tier Citizenship Activated</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              >
                ●
              </motion.span>
              <span>Welcome Vault Token Credited</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Enter Dashboard Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2 }}
        >
          <Button
            onClick={() => navigate("/dashboard")}
            size="lg"
            className="px-12 h-14 text-lg font-semibold"
          >
            Enter Dashboard →
          </Button>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="text-xs text-muted-foreground mt-8"
        >
          Your journey into the network begins now
        </motion.p>
      </div>
    </motion.div>
  );
};

export default WelcomeFinalization;
