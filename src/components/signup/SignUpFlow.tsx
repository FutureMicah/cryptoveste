import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import PreLoadScene from "./PreLoadScene";
import PathSelection from "./PathSelection";
import IdentityCreation from "./IdentityCreation";
import EmailVerification from "./EmailVerification";
import PaymentActivation from "./PaymentActivation";
import WelcomeFinalization from "./WelcomeFinalization";
import InvestorKYCFlow from "./InvestorKYCFlow";
import SuccessCelebration from "./SuccessCelebration";

const SignUpFlow = () => {
  const [step, setStep] = useState<"preload" | "path" | "identity" | "verify" | "payment" | "kyc" | "success" | "welcome">("preload");
  const [accountType, setAccountType] = useState<"student" | "investor" | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const handlePathSelect = (path: "student" | "investor") => {
    setAccountType(path);
    setStep("identity");
  };

  const handleIdentityComplete = (data: any) => {
    setUserData(data);
    // Check if email verification is required
    if (data.requiresEmailVerification) {
      setStep("verify");
    } else {
      // Investors go to KYC, students go to payment
      if (data.accountType === "investor") {
        setStep("kyc");
      } else {
        setStep("payment");
      }
    }
  };

  const handleEmailVerified = () => {
    // After email verification, proceed based on account type
    if (userData?.accountType === "investor") {
      setStep("kyc");
    } else {
      setStep("payment");
    }
  };

  const handleResendEmail = () => {
    // Email verification component handles this internally
  };

  const handleKYCComplete = () => {
    setStep("payment");
  };

  const handlePaymentComplete = () => {
    // Show celebration first
    setShowCelebration(true);
  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    setStep("welcome");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Success Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <SuccessCelebration
            userName={userData?.formData?.firstName}
            onComplete={handleCelebrationComplete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === "preload" && (
          <PreLoadScene key="preload" onComplete={() => setStep("path")} />
        )}

        {step === "path" && (
          <div key="path" className="min-h-screen flex items-center justify-center py-8 sm:py-12">
            <PathSelection onSelect={handlePathSelect} />
          </div>
        )}

        {step === "identity" && accountType && (
          <div key="identity" className="min-h-screen flex items-center justify-center py-8 sm:py-12">
            <IdentityCreation
              accountType={accountType}
              onNext={handleIdentityComplete}
            />
          </div>
        )}

        {step === "verify" && userData && (
          <div key="verify" className="min-h-screen flex items-center justify-center py-8 sm:py-12">
            <EmailVerification
              email={userData.formData?.email || ""}
              onVerified={handleEmailVerified}
              onResendEmail={handleResendEmail}
            />
          </div>
        )}

        {step === "kyc" && userData && (
          <div key="kyc" className="min-h-screen flex items-center justify-center py-8 sm:py-12">
            <InvestorKYCFlow onComplete={handleKYCComplete} />
          </div>
        )}

        {step === "payment" && userData && (
          <div key="payment" className="min-h-screen flex items-center justify-center py-8 sm:py-12">
            <PaymentActivation
              userData={userData}
              countryInfo={userData.countryInfo}
              onComplete={handlePaymentComplete}
            />
          </div>
        )}

        {step === "welcome" && (
          <WelcomeFinalization key="welcome" userData={userData} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SignUpFlow;
