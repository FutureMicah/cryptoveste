import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, Loader2, ArrowLeft, Mail, Lock, User } from "lucide-react";

type Mode = "signin" | "signup";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    document.title = mode === "signin" ? "Sign in — CryptoVest" : "Create account — CryptoVest";
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard");
    });
  }, [navigate, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { first_name: firstName } },
      });
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Account created! Check your email to verify.");
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  const handleReset = async () => {
    if (!email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
  };

  return (
    <div className="min-h-screen gradient-dark-card text-foreground flex flex-col">
      <header className="px-5 pt-5 pb-3 flex items-center justify-between max-w-md mx-auto w-full">
        <Link to="/" className="w-10 h-10 rounded-full bg-card border border-border grid place-items-center" aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <Link to="/" className="flex items-center gap-2 font-bold">
          <span className="w-8 h-8 rounded-xl gradient-lime grid place-items-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </span>
          CryptoVest
        </Link>
        <span className="w-10" />
      </header>

      <main className="flex-1 px-4 max-w-md mx-auto w-full">
        {/* Hero */}
        <section className="surface-lime rounded-[28px] p-6 mt-3">
          <h1 className="text-2xl font-bold leading-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm opacity-70 mt-1">
            {mode === "signin"
              ? "Sign in to manage your investments."
              : "Start growing your crypto in a few taps."}
          </p>
        </section>

        {/* Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-card border border-border rounded-full p-1 mt-4">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-2.5 text-xs font-semibold rounded-full transition ${
                mode === m ? "gradient-lime text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label className="text-xs">First name</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="h-12 rounded-2xl pl-11 bg-card border-border" />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-2xl pl-11 bg-card border-border" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Password</Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required className="h-12 rounded-2xl pl-11 bg-card border-border" />
            </div>
            {mode === "signin" && (
              <button type="button" onClick={handleReset} className="text-xs text-primary hover:underline">
                Forgot password?
              </button>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-full gradient-lime text-primary-foreground border-0 font-semibold">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-[11px]"><span className="bg-background px-3 text-muted-foreground">or continue with</span></div>
        </div>

        <Button variant="outline" type="button" onClick={handleGoogle} className="w-full h-12 rounded-full bg-card border-border">
          Continue with Google
        </Button>

        <p className="text-center text-[11px] text-muted-foreground mt-6 pb-8">
          By continuing you agree to our terms & privacy policy.
        </p>
      </main>
    </div>
  );
};

export default Auth;
