import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import IntroSequence from "@/components/IntroSequence";
import CustomCursor from "@/components/CustomCursor";
import LoginPanel from "@/components/LoginPanel";
import AnimatedBackground from "@/components/AnimatedBackground";
import ReferralLeaderboard from "@/components/ReferralLeaderboard";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <CustomCursor />
      <AnimatePresence mode="wait">
        {showIntro ? (
          <IntroSequence key="intro" onComplete={() => setShowIntro(false)} />
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative min-h-screen flex items-center justify-center py-12"
          >
            <AnimatedBackground />
            
            {/* Admin Button - Top Right */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute top-4 right-4 z-20"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin")}
                className="gap-2 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Button>
            </motion.div>
            
            {/* Main Content */}
            <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Login Panel - Takes 2 columns on large screens */}
                <div className="lg:col-span-2">
                  <LoginPanel />
                </div>
                
                {/* Leaderboard - Takes 1 column on large screens */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="lg:col-span-1"
                >
                  <ReferralLeaderboard />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
