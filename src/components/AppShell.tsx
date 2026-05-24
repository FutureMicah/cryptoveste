import { ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Bell, LogOut, ArrowLeft } from "lucide-react";
import BottomNav from "./BottomNav";

interface Props {
  title?: string;
  back?: boolean;
  children: ReactNode;
  showHeader?: boolean;
}

const AppShell = ({ title, back, children, showHeader = true }: Props) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen gradient-dark-card text-foreground pb-24 overflow-x-hidden">
      {showHeader && (
        <header className="px-3 pt-4 pb-2 flex items-center justify-between gap-2 max-w-md mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            {back ? (
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-full bg-card border border-border grid place-items-center shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <Link to="/dashboard" className="w-9 h-9 rounded-full gradient-lime grid place-items-center font-bold text-primary-foreground text-sm shrink-0">
                {(user?.email?.[0] ?? "U").toUpperCase()}
              </Link>
            )}
            {title && <h1 className="font-bold text-sm truncate">{title}</h1>}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button className="w-9 h-9 rounded-full bg-card border border-border grid place-items-center" aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={() => signOut().then(() => navigate("/"))}
              className="w-9 h-9 rounded-full bg-card border border-border grid place-items-center"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}
      <main className="px-3 max-w-md mx-auto">{children}</main>
      <BottomNav />
    </div>
  );
};

export default AppShell;
