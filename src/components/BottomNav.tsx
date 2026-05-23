import { NavLink, useNavigate } from "react-router-dom";
import { Home, TrendingUp, ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";

const items = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/invest", icon: TrendingUp, label: "Invest" },
  { to: "/deposit", icon: ArrowDownLeft, label: "Deposit", center: true },
  { to: "/withdraw", icon: ArrowUpRight, label: "Withdraw" },
  { to: "/history", icon: Clock, label: "History" },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,420px)]">
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-full px-2 py-2 flex items-center justify-between shadow-2xl">
        {items.map((it) =>
          it.center ? (
            <NavLink key={it.to} to={it.to} className="-my-3">
              {({ isActive }) => (
                <div className={`w-14 h-14 rounded-full grid place-items-center transition ${isActive ? "gradient-lime glow-lime" : "gradient-lime"}`}>
                  <it.icon className="w-6 h-6 text-primary-foreground" />
                </div>
              )}
            </NavLink>
          ) : (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/dashboard"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <it.icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{it.label}</span>
            </NavLink>
          )
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
