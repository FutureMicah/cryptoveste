import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import VerificationCheckmark from "./VerificationCheckmark";

interface PaymentVerificationSuccessProps {
  onComplete?: () => void;
  title?: string;
  message?: string;
}

export const PaymentVerificationSuccess = ({
  onComplete,
  title = "Payment Verified!",
  message = "Your payment has been confirmed. Welcome to BlackPAL!",
}: PaymentVerificationSuccessProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Auto complete after animation
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 4000);

    return () => {
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="text-center px-6"
      >
        {/* Glowing Checkmark */}
        <div className="mb-8">
          <VerificationCheckmark size="xl" playSound={true} />
        </div>

        {/* Title with glow */}
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-white mb-3"
          style={{
            textShadow: "0 0 20px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3)",
          }}
        >
          {title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-lg text-white/80 max-w-md mx-auto"
        >
          {message}
        </motion.p>

        {/* Animated progress bar */}
        <motion.div
          className="mt-8 h-1 w-64 mx-auto bg-muted/30 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 1, duration: 2.5, ease: "easeInOut" }}
            style={{
              boxShadow: "0 0 20px rgba(34, 197, 94, 0.8)",
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};