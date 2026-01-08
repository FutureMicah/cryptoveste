import { useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, MessageCircle } from "lucide-react";
import VerificationCheckmark from "./VerificationCheckmark";

interface PaymentVerificationSuccessProps {
  onComplete?: () => void;
  title?: string;
  message?: string;
}

const TELEGRAM_GROUP = "https://t.me/+J0p7oeR8r4k3Yjg0";
const TELEGRAM_CHANNEL = "https://t.me/BLACKTRADEACADEMYfreechannel";
const SUPPORT_USERNAME = "@Futuremicah";

export const PaymentVerificationSuccess = ({
  onComplete,
  title = "Payment Verified!",
  message = "Your payment has been confirmed. Welcome to BlackPAL!",
}: PaymentVerificationSuccessProps) => {

  useEffect(() => {
    // Auto complete after longer delay to allow user to see links
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 8000);

    return () => {
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md overflow-y-auto py-8"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="text-center px-6 max-w-lg"
      >
        {/* Glowing Checkmark */}
        <div className="mb-6">
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
          className="text-lg text-white/80 mb-6"
        >
          {message}
        </motion.p>

        {/* Telegram Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="space-y-3 mb-6"
        >
          <a
            href={TELEGRAM_GROUP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/30"
            style={{
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)",
            }}
          >
            <MessageCircle className="w-5 h-5" />
            Join Private Trading Group
            <ExternalLink className="w-4 h-4" />
          </a>

          <a
            href={TELEGRAM_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/20 transition-all duration-300"
          >
            <MessageCircle className="w-5 h-5" />
            Follow Free Channel
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Support Contact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="text-sm text-white/60"
        >
          <p>Need help? Contact support:</p>
          <a
            href={`https://t.me/${SUPPORT_USERNAME.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            {SUPPORT_USERNAME}
          </a>
        </motion.div>

        {/* Animated progress bar */}
        <motion.div
          className="mt-6 h-1 w-64 mx-auto bg-muted/30 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 1.7, duration: 6, ease: "easeInOut" }}
            style={{
              boxShadow: "0 0 20px rgba(34, 197, 94, 0.8)",
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};