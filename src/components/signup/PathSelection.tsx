import { motion } from "framer-motion";
import { GraduationCap, Briefcase } from "lucide-react";

interface PathSelectionProps {
  onSelect: (path: "student" | "investor") => void;
}

const PathSelection = ({ onSelect }: PathSelectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-5xl mx-auto px-4"
    >
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold text-foreground mb-4"
        >
          Choose Your Path
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg"
        >
          Select the journey that defines you
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Student Card */}
        <motion.div
          whileHover={{ scale: 1.03, rotateY: 5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("student")}
          className="glass-card rounded-3xl p-10 cursor-pointer relative overflow-hidden group"
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
          
          <div className="relative z-10">
            <motion.div
              className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 mx-auto"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <GraduationCap className="w-10 h-10 text-primary" />
            </motion.div>

            <h2 className="text-3xl font-bold text-foreground mb-4 text-center">Student</h2>
            <p className="text-muted-foreground text-center text-lg">
              Learn. Trade. Become Elite.
            </p>

            <div className="mt-8 pt-6 border-t border-border/50">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Access to premium trading signals
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Interactive learning modules
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Community support network
                </li>
              </ul>
            </div>
          </div>

          <motion.div
            className="absolute inset-0 border-2 border-primary rounded-3xl opacity-0 group-hover:opacity-100"
            initial={{ scale: 0.9 }}
            whileHover={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>

        {/* Investor Card */}
        <motion.div
          whileHover={{ scale: 1.03, rotateY: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("investor")}
          className="glass-card rounded-3xl p-10 cursor-pointer relative overflow-hidden group"
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          />
          
          <div className="relative z-10">
            <motion.div
              className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6 mx-auto"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Briefcase className="w-10 h-10 text-accent" />
            </motion.div>

            <h2 className="text-3xl font-bold text-foreground mb-4 text-center">Investor</h2>
            <p className="text-muted-foreground text-center text-lg">
              Fund. Partner. Earn Returns.
            </p>

            <div className="mt-8 pt-6 border-t border-border/50">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Exclusive investment opportunities
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Portfolio management tools
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  Direct partnership channels
                </li>
              </ul>
            </div>
          </div>

          <motion.div
            className="absolute inset-0 border-2 border-accent rounded-3xl opacity-0 group-hover:opacity-100"
            initial={{ scale: 0.9 }}
            whileHover={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PathSelection;
