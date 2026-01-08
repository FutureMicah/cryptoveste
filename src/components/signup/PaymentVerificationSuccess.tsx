import { useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, MessageCircle } from "lucide-react";
import VerificationCheckmark from "./VerificationCheckmark";

interface PaymentVerificationSuccessProps {
  onComplete?: () => void;
  title?: string;
  message?: string;
  userName?: string;
}

const TELEGRAM_GROUP = "https://t.me/+J0p7oeR8r4k3Yjg0";
const TELEGRAM_CHANNEL = "https://t.me/BLACKTRADEACADEMYfreechannel";
const SUPPORT_USERNAME = "@Futuremicah";

const ONBOARDING_STEPS = [
  { step: 1, text: "Join the Private Trading Group", icon: "📱" },
  { step: 2, text: "Complete your profile setup", icon: "👤" },
  { step: 3, text: "Attend the next live session", icon: "🎯" },
  { step: 4, text: "Start your trading journey", icon: "🚀" },
];

export const PaymentVerificationSuccess = ({
  onComplete,
  title = "Payment Verified!",
  message = "Your payment has been confirmed. Welcome to BlackPAL!",
  userName,
}: PaymentVerificationSuccessProps) => {
  const displayName = userName || "Ascendant";

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
          className="text-2xl md:text-3xl font-bold text-white mb-2"
          style={{
            textShadow: "0 0 20px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3)",
          }}
        >
          Welcome, {displayName}! 🎉
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-lg text-white/80 mb-4"
        >
          {title} {message}
        </motion.p>

        {/* Onboarding Steps */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white/5 rounded-xl p-4 mb-5 border border-white/10"
        >
          <p className="text-sm text-white/70 mb-3 font-medium">Your Next Steps:</p>
          <div className="space-y-2">
            {ONBOARDING_STEPS.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Telegram Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="space-y-3 mb-5"
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
            📱 Join Private Trading Group
            <ExternalLink className="w-4 h-4" />
          </a>

          <a
            href={TELEGRAM_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/20 transition-all duration-300"
          >
            <MessageCircle className="w-5 h-5" />
            📢 Follow Free Channel
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