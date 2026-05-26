import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownLeft, TrendingUp, Plus, Bell, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

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
  const { prices } = useCryptoPrices();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "CryptoVest — Simple Crypto Investment";
    supabase.from("investment_plans").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

  const goStart = () => navigate(isAuthenticated ? "/dashboard" : "/auth");

  return (
    <div className="min-h-screen gradient-dark-card text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-3 sm:px-5 h-14 sm:h-16 gap-2">
          <Link to="/" className="flex items-center gap-1.5 font-bold text-sm sm:text-base min-w-0">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl gradient-lime grid place-items-center shrink-0">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </span>
            <span className="truncate">CryptoVest</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="rounded-full px-2 sm:px-3">
              <ShieldCheck className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Admin</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="rounded-full px-2 sm:px-3 text-xs sm:text-sm">Sign in</Button>
            <Button size="sm" onClick={goStart} className="rounded-full gradient-lime text-primary-foreground hover:opacity-90 border-0 px-3 text-xs sm:text-sm">
              Start
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-10 sm:py-24 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-primary/15 text-primary border border-primary/30 mb-4">
              ⚡ Crypto investing, simplified
            </span>
            <h1 className="text-3xl sm:text-6xl font-bold tracking-tight mb-4 leading-tight">
              Grow your <span className="text-lime-gradient">crypto wealth</span> in a few taps
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground mb-6 max-w-md">
              Deposit USDT, pick a plan, watch your balance grow. No charts, no jargon — just simple, transparent investing.
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Button size="lg" onClick={goStart} className="rounded-full h-11 sm:h-12 px-5 sm:px-7 text-sm gradient-lime text-primary-foreground hover:opacity-90 border-0">
                Start Investing <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="rounded-full h-11 sm:h-12 px-5 sm:px-7 text-sm">
                Sign in
              </Button>
            </div>
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30 mb-5">
              ⚡ Crypto investing, simplified
            </span>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-5">
              Grow your <span className="text-lime-gradient">crypto wealth</span> in a few taps
            </h1>
            <p className="text-lg text-muted-foreground mb-7 max-w-md">
              Deposit USDT, pick a plan, watch your balance grow. No charts, no jargon — just simple, transparent investing.
            </p>
            <div className="flex gap-3">
              <Button size="lg" onClick={goStart} className="rounded-full h-12 px-7 gradient-lime text-primary-foreground hover:opacity-90 border-0">
                Start Investing <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="rounded-full h-12 px-7">
                Sign in
              </Button>
            </div>
          </div>

          {/* Mock phone preview */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="bg-card border border-border rounded-[42px] p-3 shadow-2xl">
              <div className="rounded-[34px] bg-background p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full gradient-lime" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Welcome back</p>
                      <p className="text-xs font-semibold">Janvis</p>
                    </div>
                  </div>
                  <Bell className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="surface-lime rounded-[22px] p-5">
                  <p className="text-xs opacity-70">Total Balance</p>
                  <p className="text-3xl font-bold mt-1">$23,590.73</p>
                  <span className="inline-block text-[10px] font-semibold bg-black/15 px-2 py-0.5 rounded-full mt-2">+7.24% this week</span>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {[
                      { l: "Invest", I: TrendingUp },
                      { l: "Deposit", I: ArrowDownLeft },
                      { l: "Withdraw", I: ArrowUpRight },
                    ].map((a) => (
                      <div key={a.l} className="bg-black/15 rounded-xl py-2.5 flex flex-col items-center gap-1">
                        <a.I className="w-4 h-4" />
                        <span className="text-[10px] font-semibold">{a.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2">Live Prices</p>
                  <div className="grid grid-cols-2 gap-2">
                    {prices.slice(0, 2).map((p) => (
                      <div key={p.id} className="bg-card border border-border rounded-xl p-2.5">
                        <div className="flex justify-between text-[10px]"><span className="font-semibold">{p.symbol}</span><span className={p.change24h >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}>{p.change24h.toFixed(1)}%</span></div>
                        <p className="text-sm font-bold">${p.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full gradient-lime grid place-items-center glow-lime">
              <Plus className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-4 sm:px-5 py-12 sm:py-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-4xl font-bold mb-2">Investment Plans</h2>
          <p className="text-sm text-muted-foreground">Pick a plan that fits your goals.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {plans.map((p, i) => (
            <Card key={p.id} className={`rounded-3xl p-5 sm:p-6 border-border ${i === 1 ? "surface-lime border-0" : "bg-card"}`}>
              <h3 className="font-bold text-base sm:text-lg">{p.name}</h3>
              <p className={`text-xs mb-3 min-h-[2.5rem] ${i === 1 ? "opacity-70" : "text-muted-foreground"}`}>{p.description}</p>
              <div className="text-3xl sm:text-4xl font-bold mb-1">{p.roi_percent}%</div>
              <div className={`text-xs mb-3 ${i === 1 ? "opacity-70" : "text-muted-foreground"}`}>ROI in {p.duration_days} days</div>
              <div className={`text-xs sm:text-sm pt-3 border-t space-y-1 ${i === 1 ? "border-black/20" : "border-border"}`}>
                <div className="flex justify-between"><span className={i === 1 ? "opacity-70" : "text-muted-foreground"}>Min</span><span className="font-semibold">${p.min_amount}</span></div>
                <div className="flex justify-between"><span className={i === 1 ? "opacity-70" : "text-muted-foreground"}>Max</span><span className="font-semibold">${p.max_amount.toLocaleString()}</span></div>
              </div>
              <Button onClick={goStart} className={`w-full mt-4 rounded-full ${i === 1 ? "bg-black text-white hover:bg-black/90" : "gradient-lime text-primary-foreground border-0"}`}>
                Invest
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-5 py-10 sm:py-16">
        <h2 className="text-2xl sm:text-4xl font-bold text-center mb-8">Three simple steps</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { n: "01", title: "Fund your wallet", desc: "Deposit USDT (BEP20) to your CryptoVest wallet in minutes." },
            { n: "02", title: "Choose a plan", desc: "Pick an investment plan that matches your goals and risk." },
            { n: "03", title: "Earn returns", desc: "Track returns daily and withdraw anytime to your wallet." },
          ].map((s, i) => (
            <Card key={i} className="rounded-3xl p-5 sm:p-6 bg-card border-border">
              <div className="text-lime-gradient text-2xl sm:text-3xl font-bold mb-2">{s.n}</div>
              <h3 className="font-semibold text-base sm:text-lg mb-1">{s.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-5 py-12 sm:py-20">
        <Card className="surface-lime rounded-[28px] sm:rounded-[32px] p-6 sm:p-14 text-center border-0">
          <ShieldCheck className="w-9 h-9 sm:w-10 sm:h-10 mx-auto mb-3" />
          <h2 className="text-2xl sm:text-4xl font-bold mb-2">Ready to start earning?</h2>
          <p className="text-sm opacity-80 mb-6 max-w-md mx-auto">Create your free account and make your first deposit in minutes.</p>
          <Button size="lg" onClick={goStart} className="rounded-full h-11 sm:h-12 px-7 sm:px-10 bg-black text-white hover:bg-black/90 text-sm">
            Open my account <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs sm:text-sm text-muted-foreground px-4">
        © {new Date().getFullYear()} CryptoVest. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;
