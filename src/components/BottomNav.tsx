import { NavLink } from "react-router-dom";
import { Home, TrendingUp, ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";

const items = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/invest", icon: TrendingUp, label: "Invest" },
  { to: "/deposit", icon: ArrowDownLeft, label: "Deposit", center: true },
  { to: "/withdraw", icon: ArrowUpRight, label: "Send" },
  { to: "/history", icon: Clock, label: "History" },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 w-[min(96vw,400px)] px-1">
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-full px-1.5 py-1.5 flex items-center justify-between shadow-2xl">
        {items.map((it) =>
          it.center ? (
            <NavLink key={it.to} to={it.to} className="-my-2 shrink-0" aria-label={it.label}>
              {({ isActive }) => (
                <div className={`w-11 h-11 rounded-full grid place-items-center transition ${isActive ? "gradient-lime glow-lime" : "gradient-lime"}`}>
                  <it.icon className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
            </NavLink>
          ) : (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/dashboard"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-full transition min-w-[44px] ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <it.icon className="w-4 h-4" />
              <span className="text-[9px] font-semibold leading-none">{it.label}</span>
            </NavLink>
          )
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
