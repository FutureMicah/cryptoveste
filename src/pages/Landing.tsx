import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, ShieldCheck, TrendingUp, Wallet, Zap, Lock, BarChart3 } from "lucide-react";
import PriceTicker from "@/components/invest/PriceTicker";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  min_amount: number;
  max_amount: number;
  roi_percent: number;
  duration_days: number;
}

const Landing = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "CryptoVest — Simple Crypto Investment Platform";
    supabase
      .from("investment_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

  const goStart = () => navigate(isAuthenticated ? "/dashboard" : "/auth");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-background/70 border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Zap className="w-4 h-4" />
            </span>
            CryptoVest
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth")}>Sign in</Button>
            <Button onClick={goStart}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30 mb-6">
            Trusted by investors worldwide
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            Grow your crypto with <span className="text-primary">simple, secure</span> investing
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Deposit USDT, pick a plan, and watch your portfolio grow. No trading experience required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={goStart} className="h-12 px-8 text-base">
              Start Investing <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => navigate("/auth")}>
              I have an account
            </Button>
          </div>

          <div className="mt-12">
            <PriceTicker />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: Wallet, title: "1. Fund your wallet", desc: "Deposit USDT (BEP20) to your CryptoVest wallet in minutes." },
            { icon: TrendingUp, title: "2. Choose a plan", desc: "Pick an investment plan that matches your goals and risk." },
            { icon: BarChart3, title: "3. Earn returns", desc: "Track returns daily and withdraw anytime to your wallet." },
          ].map((s, i) => (
            <Card key={i} className="p-6 bg-card/50 border-border/50">
              <s.icon className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Investment Plans</h2>
          <p className="text-muted-foreground">Transparent ROI. No hidden fees.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => (
            <Card key={p.id} className="p-6 bg-card/50 border-border/50 hover:border-primary/50 transition-all">
              <h3 className="font-bold text-xl mb-1">{p.name}</h3>
              <p className="text-xs text-muted-foreground mb-4 min-h-[2.5rem]">{p.description}</p>
              <div className="text-3xl font-bold text-primary mb-1">{p.roi_percent}%</div>
              <div className="text-xs text-muted-foreground mb-4">ROI in {p.duration_days} days</div>
              <div className="text-sm space-y-1 pt-4 border-t border-border/50">
                <div className="flex justify-between"><span className="text-muted-foreground">Min</span><span>${p.min_amount}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Max</span><span>${p.max_amount.toLocaleString()}</span></div>
              </div>
              <Button className="w-full mt-5" onClick={goStart}>Invest now</Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: ShieldCheck, title: "Bank-grade security", desc: "Encrypted data and protected wallets." },
            { icon: Lock, title: "Verified transactions", desc: "Every deposit reviewed by our team." },
            { icon: Zap, title: "Fast withdrawals", desc: "Get paid back to your wallet quickly." },
          ].map((f, i) => (
            <div key={i}>
              <f.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to start earning?</h2>
        <p className="text-muted-foreground mb-8">Create your free account and make your first deposit in minutes.</p>
        <Button size="lg" onClick={goStart} className="h-12 px-10">
          Open my account <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CryptoVest. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;
