import { motion } from "framer-motion";

const DynamicGreeting = () => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <motion.h2
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="text-2xl md:text-3xl font-bold mb-2 text-gradient-cyan"
    >
      {getGreeting()}.
    </motion.h2>
  );
};

export default DynamicGreeting;
