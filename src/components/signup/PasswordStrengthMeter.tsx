import { motion } from "framer-motion";
import { useMemo } from "react";

interface PasswordStrengthMeterProps {
  password: string;
}

const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };

    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Character variety
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const labels = [
      { label: "Weak", color: "bg-red-500" },
      { label: "Weak", color: "bg-red-500" },
      { label: "Fair", color: "bg-orange-500" },
      { label: "Good", color: "bg-yellow-500" },
      { label: "Strong", color: "bg-green-500" },
      { label: "Unbreakable", color: "bg-emerald-500" },
    ];

    return { score, ...labels[Math.min(score, 5)] };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      {/* Progress Bar */}
      <div className="flex gap-1">
        {[...Array(5)].map((_, index) => (
          <motion.div
            key={index}
            className="h-1 flex-1 rounded-full bg-muted overflow-hidden"
            initial={{ opacity: 0.3 }}
            animate={{ 
              opacity: index < strength.score ? 1 : 0.3,
            }}
          >
            {index < strength.score && (
              <motion.div
                className={`h-full ${strength.color}`}
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between text-xs"
      >
        <span className="text-muted-foreground">Password Strength:</span>
        <span className={`font-medium ${
          strength.score <= 2 ? "text-red-500" :
          strength.score <= 3 ? "text-yellow-500" :
          "text-green-500"
        }`}>
          {strength.label}
        </span>
      </motion.div>

      {/* Requirements */}
      {strength.score < 4 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="text-xs text-muted-foreground space-y-1 pt-2"
        >
          <p className="font-medium mb-1">Strengthen your password:</p>
          {password.length < 12 && (
            <p className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              Use at least 12 characters
            </p>
          )}
          {!/[A-Z]/.test(password) && (
            <p className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              Add uppercase letters
            </p>
          )}
          {!/[0-9]/.test(password) && (
            <p className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              Include numbers
            </p>
          )}
          {!/[^a-zA-Z0-9]/.test(password) && (
            <p className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              Add special characters (!@#$%^&*)
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
