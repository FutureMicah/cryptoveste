import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface IntroSequenceProps {
  onComplete: () => void;
}

const IntroSequence = ({ onComplete }: IntroSequenceProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Generate random particles
    const particleArray = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setParticles(particleArray);

    // Auto-complete intro after 6 seconds
    const timer = setTimeout(onComplete, 6000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Particle Background */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-accent rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0.5, 0],
              scale: [0, 1.5, 1, 0],
              x: [0, (50 - particle.x) * 5],
              y: [0, (50 - particle.y) * 5],
            }}
            transition={{
              duration: 4,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Logo Formation */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, delay: 1, ease: "easeOut" }}
      >
        <motion.div
          className="relative"
          animate={{
            filter: [
              "drop-shadow(0 0 20px hsl(51 100% 50% / 0.4))",
              "drop-shadow(0 0 60px hsl(51 100% 50% / 0.8))",
              "drop-shadow(0 0 20px hsl(51 100% 50% / 0.4))",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <img
            src="/src/assets/blackpal-logo.jpg"
            alt="BlackPAL"
            className="w-48 h-48 object-contain"
          />
        </motion.div>

        {/* Tagline */}
        <motion.h1
          className="text-3xl md:text-4xl font-bold mt-8 text-gradient-gold text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 2.5 }}
        >
          BlackPAL
        </motion.h1>
        
        <motion.p
          className="text-lg md:text-xl text-muted-foreground mt-2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 3 }}
        >
          Where Precision Meets Power
        </motion.p>
      </motion.div>

      {/* Light Beams */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, hsl(51 100% 50% / 0.1) 0%, transparent 70%)",
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </motion.div>
  );
};

export default IntroSequence;
