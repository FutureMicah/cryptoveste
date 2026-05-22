import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { TrendingUp, TrendingDown } from "lucide-react";

const PriceTicker = () => {
  const { prices, loading } = useCryptoPrices();
  if (loading) return null;
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
      {prices.map((p) => {
        const up = p.change24h >= 0;
        return (
          <div
            key={p.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/70 border border-border/50 text-sm"
          >
            <span className="font-semibold">{p.symbol}</span>
            <span className="text-muted-foreground">
              ${p.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className={`flex items-center gap-1 text-xs ${up ? "text-green-400" : "text-red-400"}`}>
              {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {p.change24h.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default PriceTicker;
