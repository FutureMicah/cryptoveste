import { Card } from "@/components/ui/card";
import { Wallet as WalletIcon, TrendingUp, DollarSign, ArrowDownToLine } from "lucide-react";
import type { Wallet } from "@/hooks/useWallet";

const stat = (label: string, value: number, Icon: any, color: string) => (
  <Card className="p-5 bg-card/50 border-border/50">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </Card>
);

const WalletSummary = ({ wallet }: { wallet: Wallet | null }) => {
  const w = wallet ?? { balance_usd: 0, total_invested: 0, total_earned: 0, total_withdrawn: 0 } as Wallet;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stat("Balance", w.balance_usd, WalletIcon, "bg-primary/20 text-primary")}
      {stat("Invested", w.total_invested, TrendingUp, "bg-blue-500/20 text-blue-400")}
      {stat("Earned", w.total_earned, DollarSign, "bg-green-500/20 text-green-400")}
      {stat("Withdrawn", w.total_withdrawn, ArrowDownToLine, "bg-purple-500/20 text-purple-400")}
    </div>
  );
};

export default WalletSummary;
