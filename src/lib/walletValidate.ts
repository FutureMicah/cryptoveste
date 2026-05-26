// Lightweight client-side wallet address validation for common networks.
// This is best-effort format validation — not a substitute for on-chain verification.

export type ValidationResult = { ok: boolean; reason?: string };

const isHex = (s: string, len: number) => new RegExp(`^0x[a-fA-F0-9]{${len}}$`).test(s);
const isBase58 = (s: string) => /^[1-9A-HJ-NP-Za-km-z]+$/.test(s);

export function validateAddress(currency: string, network: string, address: string): ValidationResult {
  const c = (currency || "").toUpperCase();
  const n = (network || "").toUpperCase();
  const a = (address || "").trim();
  if (!a) return { ok: false, reason: "Address is empty" };

  // EVM networks: BEP20 (BSC), ERC20 (Ethereum), Polygon, Arbitrum
  if (["BEP20", "ERC20", "ETH", "BSC", "POLYGON", "ARBITRUM"].includes(n) || c === "ETH") {
    return isHex(a, 40) ? { ok: true } : { ok: false, reason: "Expected EVM address (0x + 40 hex)" };
  }

  // Tron TRC20 / TRX
  if (n === "TRC20" || n === "TRON") {
    if (!a.startsWith("T") || a.length !== 34 || !isBase58(a))
      return { ok: false, reason: "Tron address must start with T and be 34 chars" };
    return { ok: true };
  }

  // Bitcoin
  if (c === "BTC" || n === "BTC" || n === "BITCOIN") {
    if (/^bc1[ac-hj-np-z02-9]{11,71}$/i.test(a)) return { ok: true }; // bech32
    if (/^(1|3)[1-9A-HJ-NP-Za-km-z]{25,39}$/.test(a)) return { ok: true }; // legacy / p2sh
    return { ok: false, reason: "Not a valid BTC address" };
  }

  // Solana
  if (n === "SOL" || c === "SOL" || n === "SOLANA") {
    return a.length >= 32 && a.length <= 44 && isBase58(a)
      ? { ok: true }
      : { ok: false, reason: "Invalid Solana address" };
  }

  // Litecoin
  if (c === "LTC") {
    if (/^(L|M|ltc1)[a-zA-HJ-NP-Z0-9]{25,71}$/.test(a)) return { ok: true };
    return { ok: false, reason: "Invalid LTC address" };
  }

  // Fallback minimal sanity check
  if (a.length < 20) return { ok: false, reason: "Address looks too short" };
  return { ok: true };
}
