import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import blackpalLogo from "@/assets/blackpal-logo.jpg";

interface IntroSequenceProps {
  onComplete: () => void;
}

const IntroSequence = ({ onComplete }: IntroSequenceProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    const particleArray = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setParticles(particleArray);

    setTimeout(() => setShowTagline(true), 2000);
    const timer = setTimeout(onComplete, 5000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0a0a0a] to-[#1a1a1a]" />

      {/* Swirling Particles */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              background: `radial-gradient(circle, rgba(0,255,255,${0.8 + Math.random() * 0.2}) 0%, transparent 70%)`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0.6, 0],
              scale: [0, 2, 1.5, 0],
              x: [0, (50 - particle.x) * 3],
              y: [0, (50 - particle.y) * 3],
            }}
            transition={{
              duration: 4,
              delay: particle.delay,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Center Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
      >
        {/* Logo with Glow */}
        <motion.div
          className="relative mb-8"
          animate={{
            filter: [
              "drop-shadow(0 0 30px rgba(0,255,255,0.4))",
              "drop-shadow(0 0 60px rgba(0,255,255,0.8))",
              "drop-shadow(0 0 30px rgba(0,255,255,0.4))",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <img
            src={blackpalLogo}
            alt="BlackPAL"
            className="w-40 h-40 md:w-56 md:h-56 object-contain rounded-full"
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-accent/20"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        {/* Brand Name - Letter by Letter */}
        <motion.div className="flex gap-1 mb-4">
          {"BLACKPAL".split("").map((letter, i) => (
            <motion.span
              key={i}
              className="text-4xl md:text-5xl font-bold text-gradient-cyan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 1.5 + i * 0.1 }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.div>

        {/* Tagline */}
        {showTagline && (
          <motion.p
            className="text-lg md:text-xl text-muted-foreground text-center max-w-md"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Ascend Beyond Ordinary
          </motion.p>
        )}
      </motion.div>

      {/* Radial Pulse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(0,255,255,0.15) 0%, transparent 60%)",
        }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
};

export default IntroSequence;
