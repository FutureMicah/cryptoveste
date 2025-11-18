import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface PreLoadSceneProps {
  onComplete: () => void;
}

const PreLoadScene = ({ onComplete }: PreLoadSceneProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStage(1), 500);
    const timer2 = setTimeout(() => setStage(2), 1000);
    const timer3 = setTimeout(() => onComplete(), 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-black flex items-center justify-center z-50"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        {/* Line Animation */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ width: 0, height: 2 }}
          animate={{ width: stage >= 1 ? 200 : 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent" />
        </motion.div>

        {/* Logo/Text */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: stage >= 1 ? 1 : 0,
            scale: stage >= 1 ? 1 : 0.8,
          }}
          className="text-center"
        >
          <motion.h1
            className="text-5xl font-bold text-white mb-4"
            animate={{
              textShadow: [
                "0 0 10px rgba(255,255,255,0.3)",
                "0 0 20px rgba(255,255,255,0.6)",
                "0 0 10px rgba(255,255,255,0.3)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            BlackPAL
          </motion.h1>

          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: stage >= 2 ? 1 : 0 }}
            transition={{ delay: 0.3 }}
          >
            {stage >= 2 ? "Loading Identity Terminal..." : "Establishing Secure Connection..."}
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PreLoadScene;
