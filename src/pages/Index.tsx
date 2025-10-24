import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IntroSequence from "@/components/IntroSequence";
import CustomCursor from "@/components/CustomCursor";
import LoginPanel from "@/components/LoginPanel";

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <div className="custom-cursor">
      <CustomCursor />
      
      <AnimatePresence mode="wait">
        {showIntro ? (
          <IntroSequence key="intro" onComplete={() => setShowIntro(false)} />
        ) : (
          <motion.div
            key="login"
            className="min-h-screen bg-hero flex items-center justify-center p-4 relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-accent/30 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>

            {/* Light Beams */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{
                background: [
                  "radial-gradient(ellipse at 30% 50%, hsl(51 100% 50% / 0.05) 0%, transparent 50%)",
                  "radial-gradient(ellipse at 70% 50%, hsl(194 100% 50% / 0.05) 0%, transparent 50%)",
                  "radial-gradient(ellipse at 30% 50%, hsl(51 100% 50% / 0.05) 0%, transparent 50%)",
                ],
              }}
              transition={{ duration: 8, repeat: Infinity }}
            />

            <LoginPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
