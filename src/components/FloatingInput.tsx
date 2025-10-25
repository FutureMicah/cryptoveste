import { useState, InputHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
}

const FloatingInput = ({ label, icon, type, className, ...props }: FloatingInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;

  return (
    <div className="relative">
      <motion.div
        className={cn(
          "relative rounded-xl border transition-all duration-300",
          isFocused ? "border-accent cyan-glow" : "border-white/20"
        )}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          {...props}
          type={inputType}
          className={cn(
            "w-full bg-transparent px-4 py-3.5 text-foreground outline-none transition-all",
            icon && "pl-10",
            isPasswordField && "pr-10",
            className
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => {
            setHasValue(e.target.value.length > 0);
            props.onChange?.(e);
          }}
        />
        <motion.label
          className={cn(
            "absolute pointer-events-none transition-all duration-300",
            icon ? "left-10" : "left-4",
            isFocused || hasValue
              ? "-top-2.5 text-xs bg-background px-2 text-accent"
              : "top-1/2 -translate-y-1/2 text-muted-foreground"
          )}
        >
          {label}
        </motion.label>
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default FloatingInput;
