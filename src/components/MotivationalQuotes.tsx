import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const quotes = [
  "Discipline Builds Dynasties.",
  "Stay Calm. Stay Sharp.",
  "The Market Rewards Patience.",
  "Power isn't given — it's logged in.",
  "Every click defines your next move.",
  "Precision. Patience. Profit.",
];

const MotivationalQuotes = () => {
  const [currentQuote, setCurrentQuote] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center h-8 relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={currentQuote}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="text-sm md:text-base text-muted-foreground italic absolute inset-0 flex items-center justify-center"
        >
          "{quotes[currentQuote]}"
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export default MotivationalQuotes;
