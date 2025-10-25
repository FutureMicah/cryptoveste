import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IntroSequence from "@/components/IntroSequence";
import CustomCursor from "@/components/CustomCursor";
import LoginPanel from "@/components/LoginPanel";
import AnimatedBackground from "@/components/AnimatedBackground";

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);

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
            
            {/* Main Content */}
            <div className="relative z-10 w-full">
              <LoginPanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
