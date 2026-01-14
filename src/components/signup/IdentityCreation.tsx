import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Mail, Lock, User, Phone, Tag, Chrome, AtSign } from "lucide-react";
import FloatingInput from "../FloatingInput";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import EnhancedGeoDetector from "./EnhancedGeoDetector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CountryInfo {
  country: string;
  countryCode: string;
  flag: string;
  zone: "nigeria" | "africa" | "international";
  fee: number;
  currency: string;
  paymentMethods: string[];
}

interface IdentityCreationProps {
  accountType: "student" | "investor";
  onNext: (data: any) => void;
}

const IdentityCreation = ({ accountType, onNext }: IdentityCreationProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    telegramUsername: "",
    referralCode: "",
  });
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showReferral, setShowReferral] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!formData.telegramUsername.trim()) {
      toast.error("Telegram username is required");
      return;
    }

    // Format telegram username
    let telegramUsername = formData.telegramUsername.trim();
    if (!telegramUsername.startsWith("@")) {
      telegramUsername = "@" + telegramUsername;
    }

    setIsLoading(true);

    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/signup`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            telegram_username: telegramUsername,
            account_type: accountType,
            referral_code: formData.referralCode || null,
          },
        },
      });

      if (error) throw error;

      // Pass data to next step (email verification)
      onNext({
        user: data.user,
        formData: { ...formData, telegramUsername },
        countryInfo,
        accountType,
        requiresEmailVerification: !data.user?.email_confirmed_at,
      });

      toast.success("Account created! Please verify your email...");
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.message?.includes("already registered")) {
        toast.error("This email is already registered. Please login instead.");
      } else {
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast.error(error.message || "Google sign-in failed");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-2xl mx-auto px-4"
    >
      <div className="glass-card rounded-3xl p-6 sm:p-8 md:p-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2"
          >
            Identity Creation
          </motion.h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {accountType === "student" ? "Student" : "Investor"} Registration
          </p>
        </div>

        {/* Country Detection */}
        <div className="mb-6">
          <EnhancedGeoDetector onCountryDetected={setCountryInfo} blockVPN={true} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FloatingInput
              label="First Name"
              icon={<User className="w-5 h-5" />}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <FloatingInput
              label="Last Name"
              icon={<User className="w-5 h-5" />}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <FloatingInput
            label="Email"
            type="email"
            icon={<Mail className="w-5 h-5" />}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FloatingInput
              label="Phone Number"
              type="tel"
              icon={<Phone className="w-5 h-5" />}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <FloatingInput
              label="Telegram Username"
              icon={<AtSign className="w-5 h-5" />}
              value={formData.telegramUsername}
              onChange={(e) => setFormData({ ...formData, telegramUsername: e.target.value })}
              placeholder="@username"
              required
            />
          </div>

          <div>
            <FloatingInput
              label="Password"
              type="password"
              icon={<Lock className="w-5 h-5" />}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <PasswordStrengthMeter password={formData.password} />
          </div>

          <FloatingInput
            label="Confirm Password"
            type="password"
            icon={<Lock className="w-5 h-5" />}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />

          {/* Referral Code (Collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowReferral(!showReferral)}
              className="text-sm text-primary hover:underline mb-2"
            >
              {showReferral ? "Hide" : "Have a referral code?"}
            </button>
            
            {showReferral && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <FloatingInput
                  label="Referral Code (Optional)"
                  icon={<Tag className="w-5 h-5" />}
                  value={formData.referralCode}
                  onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                />
              </motion.div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold"
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account →"}
          </Button>

          {/* Google Sign In */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">OR</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 sm:h-14"
            onClick={handleGoogleSignIn}
          >
            <Chrome className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>
        </form>

        {/* Security Notice */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-center text-muted-foreground mt-6"
        >
          🔒 Encrypted. Secure. Private.
        </motion.p>
      </div>
    </motion.div>
  );
};

export default IdentityCreation;
