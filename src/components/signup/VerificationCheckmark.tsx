import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface VerificationCheckmarkProps {
  size?: "sm" | "md" | "lg" | "xl";
  playSound?: boolean;
  label?: string;
  onAnimationComplete?: () => void;
}

// High-quality chime sound as base64
const CHIME_SOUND = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+9DEAAAGAAGn9AAAIi3Js/80kABJJEkkkSZNJNGkrZBCCsKwRVgqwsEWFYKsKwrCsKwrBFhWCrCsEWFYVgiwrBVhYIsKwVYWCLCsFWFYIsKwRYWCLCwRYWCLCsEWFgqwrCsKwRYVhWCLCwVYVgqwsFWFYKsKwVYVgqwrBVhWFYIsLBFhYKsLBFhWFYVgiwsFWFgiwrCsKwRYWCrCsKwRYWCLCwRYVhWCLCwVYVgiwrBVhWCrCsKwrBVhWFYKsLBVhYIsLBFhYIsKwrCsEWFgqwsEWFYVhWFYVhWCLCsKwrBFhYKsKwrBFhYKsKwRYWCrCwRYWCrCsKwRYVhWFYVhWFYVhWFYVhWFYVhWFYVhWFYVhWFYVhWFYVhWFYVhWFYVhWFYVhWFYVhQAAAAP/7UMQAAw8A6WvwQAAgAADSAAAAEVgCLgBBR5R4d3vDuHePK8Ofzg5zuBwOdg5+UOOcccc/lHHHOOdwOBzsHOcccc/8oc53A52DnO4HA4HO4c5xxxxzjnc7gcDgc7Bzncccc//KOOc7hz+d/5Q45xxxzn8o4/+Ucc53Dn8octxyuOUOdzudwOdzuc7nYOc7hznc7BznYOc7gj/+1DEAIMOYOt9+YAAIAAANIAAAASP/KOOc7hzuc7hzuBzn/lDnO4c5/O/8occ53A52Dn8o8cc7/lHHOOcc/ncccc/KOOc7hzn87gc7nYOc7hzuBzudzn87gj/yhxxzjnHO5zuHOdxyhx/5Rxzjnc7gcDnYOc7hzn/lHHOdw5/O4c/nf8o45zudznc7gcDnP5Q5zuHOdw5zuBwOdg5zuHP//8o45zuHP53A53A5zuHP/8o45zv/7UMQNgw5Q63n5gACgAADSAAAAEOdzudwOc7gc7gc7gcDgcD/yhjnO4c53Dn8oc/gf+UeOdzud/yhxzjnHO/8oc/gcDnf+Ucc53DnO4c53A5zuBwOBzn8D/yhjnHO53A52DnO4c53OwcDgcDn//+UcMc45xzv/KHHO/yo45znf+UOOcb/kYxx/8oYYYxxv8jjlHGN/yMY3/Ixjf8jDDD/ygwwxjf5GMMMY3+RjG/5GN/kcccc3/JxjjnG/5OMf/tQxAyDDmjrf/mAAKAAANIAAAASOb/k443+TjjjG/5PHG/5OMb/kccc43/Ixxv+Tjjf8nGOMb/k8c43/I443/I5xv8nHG/5HHG/yeOOMb/kY4xuOOMbhyMcbjjjlDnG4443/Jxx/8nHHGNw5OOMbjjDG4c43DkYxuOOOMbjjjlHGNw5GOMbjjjlHGN/yeOMb/kY4xv+Tjjf5PHG/5HHG/5PHG4443/I443/I443DIwxv8nHHG4cjGNxxxx/8jG/5HG/5PHHG/yeOb/J443/I44//tQxAeDDdDre/lgBKAAANIAAAASxuHON/yMb/I443/I44xv8njjDG4cjG/5OON/yeOd/k8cb/k8cb/J443+Tjjf5PON/yccb/k443/JxxuHJxjf5OON/yMb/k8cb/kY43DkY3/J443/Jxx/8nHH/yccf/Jxx/8nHH/yccf/Jxxv8njjf8njjf8jHG/yeON/k443+Txzjf8nHG/5OON/yccb/k443/Jxxv+RjjcOTjjf8njjf5OON/yeON/yccf/JxxuHONw5ONw//tQxAiCjYTrZ/j0AKAAANIAAAAS5HON/yccb/k443/J443/Jxxv+TjjcOTjcORjcccc43HHG45xxuOOMbjjjlHGN/yccb/J443/I443/I443/J443/J44xv+Txxx/8njjf8njjf8njjf8nHH/yMb/J443/J443/J443/J443/J443+Txxx/8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf/7UMQKAoxU6WH49ACgAADSAAAAEf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf/7UMQYAIu06U/4xACgAADSAAAAEf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf8njjf/7UMQZAAAAA0gAAAAA";

const SIZES = {
  sm: { container: "w-8 h-8", icon: 16, glow: 4 },
  md: { container: "w-12 h-12", icon: 24, glow: 6 },
  lg: { container: "w-20 h-20", icon: 40, glow: 10 },
  xl: { container: "w-32 h-32", icon: 64, glow: 16 },
};

export const VerificationCheckmark = ({
  size = "lg",
  playSound = true,
  label,
  onAnimationComplete,
}: VerificationCheckmarkProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sizeConfig = SIZES[size];

  useEffect(() => {
    if (playSound) {
      audioRef.current = new Audio(CHIME_SOUND);
      audioRef.current.volume = 0.6;
      
      const playTimer = setTimeout(() => {
        audioRef.current?.play().catch(() => {
          console.log("Audio autoplay blocked");
        });
      }, 400);

      return () => clearTimeout(playTimer);
    }
  }, [playSound]);

  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Checkmark with glow */}
      <motion.div
        className={`relative ${sizeConfig.container} flex items-center justify-center`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.2,
        }}
        onAnimationComplete={onAnimationComplete}
      >
        {/* Outer glow pulse */}
        <motion.div
          className="absolute inset-0 rounded-full bg-green-500/30"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [1, 1.5, 1.8],
            opacity: [0.6, 0.3, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 0.5,
          }}
        />

        {/* Inner glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)",
            filter: `blur(${sizeConfig.glow}px)`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Main circle */}
        <motion.div
          className={`${sizeConfig.container} rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg relative z-10`}
          style={{
            boxShadow: "0 0 30px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.3)",
          }}
          animate={{
            boxShadow: [
              "0 0 30px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.3)",
              "0 0 40px rgba(34, 197, 94, 0.8), 0 0 80px rgba(34, 197, 94, 0.4)",
              "0 0 30px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.3)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Checkmark icon with draw animation */}
          <motion.div
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Check
              size={sizeConfig.icon}
              className="text-white"
              strokeWidth={3}
            />
          </motion.div>
        </motion.div>

        {/* Sparkles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-green-300 rounded-full"
            style={{
              top: "50%",
              left: "50%",
            }}
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{
              scale: [0, 1, 0],
              x: Math.cos((i * 60 * Math.PI) / 180) * 50,
              y: Math.sin((i * 60 * Math.PI) / 180) * 50,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 0.8,
              delay: 0.5 + i * 0.05,
              ease: "easeOut",
            }}
          />
        ))}
      </motion.div>

      {/* Label */}
      {label && (
        <motion.span
          className="text-green-400 font-semibold text-sm tracking-wide"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {label}
        </motion.span>
      )}
    </motion.div>
  );
};

export default VerificationCheckmark;