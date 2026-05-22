import { useEffect, useState } from "react";

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "tether", symbol: "USDT", name: "Tether" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "solana", symbol: "SOL", name: "Solana" },
];

export const useCryptoPrices = (intervalMs = 60_000) => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchPrices = async () => {
      try {
        const ids = COINS.map((c) => c.id).join(",");
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = await res.json();
        if (cancelled) return;
        setPrices(
          COINS.map((c) => ({
            ...c,
            price: data[c.id]?.usd ?? 0,
            change24h: data[c.id]?.usd_24h_change ?? 0,
          }))
        );
      } catch (e) {
        console.error("Price fetch failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPrices();
    const id = setInterval(fetchPrices, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { prices, loading };
};
