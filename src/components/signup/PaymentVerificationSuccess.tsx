import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

interface PaymentVerificationSuccessProps {
  onComplete?: () => void;
}

export const PaymentVerificationSuccess = ({
  onComplete,
}: PaymentVerificationSuccessProps) => {
  useEffect(() => {
    // Play success sound
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjJ+zPDTgjMGHm/A7OWhUBELTKXh8bllHAU2jdXvzn0pBSh1yO/ajDwHGWe56+OgTxALTqXi77djHQU0jNXu0IAqBSh0x+7Zh0EMGWe66+KiUBELTaXi77djHAU1jNXvz4AqBSh0yO/Yh0MMGGe66+OiUBELTaXi77djHAU1jNXu0H8qBSh0yO/Xh0MNGGe66+OiUBELTaXi77ZjHAU1jNXv0H8qBShzx+7YiEQLF2a56+SjURELTKPh77ZjHQU1i9Tu0H8rBCh0x+7Yh0QLF2a56+SjURELTKPh77ZjHQU1i9Tv0H8rBCh0x+7Yh0QLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7Zh0QLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7Zh0QLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURELTKPh77ZjHAU1i9Tv0H8rBShzx+7ZiEQLF2a56+SjURH="
    );
    audio.play().catch(() => console.log("Could not play sound"));

    // Auto complete after animation
    const timer = setTimeout(() => {
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.2,
          }}
        >
          <CheckCircle className="w-32 h-32 text-green-500 mx-auto mb-6" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Payment Verified!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-lg text-white/80"
        >
          Your payment has been confirmed. Welcome to BlackPAL!
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-6 h-1 w-48 mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
        />
      </motion.div>
    </motion.div>
  );
};
