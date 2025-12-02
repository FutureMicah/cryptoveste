import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import PreLoadScene from "./PreLoadScene";
import PathSelection from "./PathSelection";
import IdentityCreation from "./IdentityCreation";
import PaymentActivation from "./PaymentActivation";
import WelcomeFinalization from "./WelcomeFinalization";
import InvestorKYCFlow from "./InvestorKYCFlow";

const SignUpFlow = () => {
  const [step, setStep] = useState<"preload" | "path" | "identity" | "payment" | "kyc" | "welcome">("preload");
  const [accountType, setAccountType] = useState<"student" | "investor" | null>(null);
  const [userData, setUserData] = useState<any>(null);

  const handlePathSelect = (path: "student" | "investor") => {
    setAccountType(path);
    setStep("identity");
  };

  const handleIdentityComplete = (data: any) => {
    setUserData(data);
    // Investors go to KYC, students go to payment
    if (data.accountType === "investor") {
      setStep("kyc");
    } else {
      setStep("payment");
    }
  };

  const handleKYCComplete = () => {
    setStep("payment");
  };

  const handlePaymentComplete = () => {
    setStep("welcome");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {step === "preload" && (
          <PreLoadScene key="preload" onComplete={() => setStep("path")} />
        )}

        {step === "path" && (
          <div key="path" className="min-h-screen flex items-center justify-center py-12">
            <PathSelection onSelect={handlePathSelect} />
          </div>
        )}

        {step === "identity" && accountType && (
          <div key="identity" className="min-h-screen flex items-center justify-center py-12">
            <IdentityCreation
              accountType={accountType}
              onNext={handleIdentityComplete}
            />
          </div>
        )}

        {step === "kyc" && userData && (
          <div key="kyc" className="min-h-screen flex items-center justify-center py-12">
            <InvestorKYCFlow onComplete={handleKYCComplete} />
          </div>
        )}

        {step === "payment" && userData && (
          <div key="payment" className="min-h-screen flex items-center justify-center py-12">
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
