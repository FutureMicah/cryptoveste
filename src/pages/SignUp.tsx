import SignUpFlow from "@/components/signup/SignUpFlow";
import CustomCursor from "@/components/CustomCursor";
import AnimatedBackground from "@/components/AnimatedBackground";

const SignUp = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <CustomCursor />
      <AnimatedBackground />
      <div className="relative z-10">
        <SignUpFlow />
      </div>
    </div>
  );
};

export default SignUp;
