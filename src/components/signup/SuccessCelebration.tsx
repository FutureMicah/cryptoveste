import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ExternalLink, MessageCircle, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import VerificationCheckmark from "./VerificationCheckmark";

interface SuccessCelebrationProps {
  onComplete?: () => void;
  userName?: string;
  showLinks?: boolean;
}

const TELEGRAM_GROUP = "https://t.me/+J0p7oeR8r4k3Yjg0";
const TELEGRAM_CHANNEL = "https://t.me/BLACKTRADEACADEMYfreechannel";
const SUPPORT_USERNAME = "@Futuremicah";

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const SuccessCelebration = ({ onComplete, userName, showLinks = true }: SuccessCelebrationProps) => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const displayName = userName || "Champion";

  // Generate confetti pieces
  useEffect(() => {
    const colors = ["#22c55e", "#10b981", "#f59e0b", "#eab308", "#3b82f6", "#8b5cf6", "#ec4899"];
    const pieces: ConfettiPiece[] = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 8,
    }));
    setConfetti(pieces);
  }, []);

  // Play celebration sound
  const playSound = useCallback(() => {
    // Success chime sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = audioContext.currentTime;
    playTone(523.25, now, 0.15); // C5
    playTone(659.25, now + 0.15, 0.15); // E5
    playTone(783.99, now + 0.3, 0.15); // G5
    playTone(1046.50, now + 0.45, 0.4); // C6
  }, []);

  useEffect(() => {
    // Play sound after a short delay for dramatic effect
    const soundTimeout = setTimeout(playSound, 300);
    
    return () => clearTimeout(soundTimeout);
  }, [playSound]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden"
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{ 
              y: -20, 
              x: `${piece.x}vw`,
              rotate: 0,
              opacity: 1 
            }}
            animate={{ 
              y: "110vh",
              rotate: 720,
              opacity: [1, 1, 0]
            }}
            transition={{ 
              duration: piece.duration,
              delay: piece.delay,
              ease: "linear"
            }}
            className="absolute"
            style={{
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: Math.random() > 0.5 ? "50%" : "0%",
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8, delay: 0.2 }}
        className="text-center px-6 max-w-lg z-10"
      >
        {/* Giant checkmark with glow */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6, delay: 0.3 }}
          className="mb-6"
        >
          <div className="relative inline-block">
            <motion.div
              animate={{ 
                boxShadow: [
                  "0 0 20px rgba(34, 197, 94, 0.5)",
                  "0 0 60px rgba(34, 197, 94, 0.8)",
                  "0 0 20px rgba(34, 197, 94, 0.5)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center"
            >
              <CheckCircle className="w-20 h-20 text-white" />
            </motion.div>
            
            {/* Sparkles */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <motion.div
                  key={angle}
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: angle / 360 }}
                  className="absolute w-3 h-3 bg-yellow-400 rounded-full"
                  style={{
                    top: `${50 + 55 * Math.sin((angle * Math.PI) / 180)}%`,
                    left: `${50 + 55 * Math.cos((angle * Math.PI) / 180)}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-white mb-2"
          style={{
            textShadow: "0 0 30px rgba(34, 197, 94, 0.6)",
          }}
        >
          🎉 Payment Verified!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-xl text-white/90 mb-2"
        >
          Welcome to BlackPAL, {displayName}!
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-white/70 mb-8"
        >
          Your trading journey begins now 🚀
        </motion.p>

        {showLinks && (
          <>
            {/* Telegram Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-3 mb-6"
            >
              <a
                href={TELEGRAM_GROUP}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/30"
                style={{
                  boxShadow: "0 0 25px rgba(59, 130, 246, 0.5)",
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

            {/* Support */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-sm text-white/60"
            >
              Need help? Contact: 
              <a
                href={`https://t.me/${SUPPORT_USERNAME.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 ml-1"
              >
                {SUPPORT_USERNAME}
              </a>
            </motion.p>
          </>
        )}

        {onComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-6"
          >
            <Button
              onClick={onComplete}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Continue to Dashboard
            </Button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SuccessCelebration;
