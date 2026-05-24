import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "lime" | "muted";
}

const EmptyState = ({ icon: Icon, title, description, action, tone = "muted" }: EmptyStateProps) => (
  <div className={`rounded-[28px] p-8 text-center flex flex-col items-center gap-3 ${
    tone === "lime" ? "surface-lime" : "bg-card border border-border"
  }`}>
    <div className={`w-14 h-14 rounded-full grid place-items-center ${
      tone === "lime" ? "bg-black/15" : "bg-primary/15 text-primary"
    }`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="space-y-1">
      <p className="font-semibold">{title}</p>
      {description && <p className={`text-xs ${tone === "lime" ? "opacity-70" : "text-muted-foreground"}`}>{description}</p>}
    </div>
    {action}
  </div>
);

export const ListSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="rounded-3xl bg-card border border-border p-4 flex items-center gap-3 animate-pulse">
        <div className="w-11 h-11 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/2 bg-muted rounded" />
          <div className="h-2 w-1/3 bg-muted rounded" />
        </div>
        <div className="h-4 w-16 bg-muted rounded" />
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ height = "h-32" }: { height?: string }) => (
  <div className={`rounded-3xl bg-card border border-border ${height} animate-pulse`} />
);

export default EmptyState;
