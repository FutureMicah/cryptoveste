import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CountryInfo {
  country: string;
  countryCode: string;
  flag: string;
  zone: "nigeria" | "africa" | "international";
  fee: number;
  currency: string;
  paymentMethods: string[];
}

interface GeoDetectorProps {
  onCountryDetected: (info: CountryInfo) => void;
}

const GeoDetector = ({ onCountryDetected }: GeoDetectorProps) => {
  const [detecting, setDetecting] = useState(true);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);

  useEffect(() => {
    detectCountry();
  }, []);

  const detectCountry = async () => {
    try {
      // Using ipapi.co for country detection
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();

      const country = data.country_name || "Unknown";
      const countryCode = data.country_code || "XX";
      const flag = `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

      let zone: CountryInfo["zone"] = "international";
      let fee = 200;
      let currency = "USD";
      let paymentMethods = ["crypto"];

      // Nigeria
      if (countryCode === "NG") {
        zone = "nigeria";
        fee = 35000;
        currency = "NGN";
        paymentMethods = ["paystack", "flutterwave", "bank", "crypto"];
      }
      // Other African countries
      else if (isAfricanCountry(countryCode)) {
        zone = "africa";
        fee = 100;
        currency = "USD";
        paymentMethods = ["crypto"];
      }

      const info: CountryInfo = {
        country,
        countryCode,
        flag,
        zone,
        fee,
        currency,
        paymentMethods,
      };

      setCountryInfo(info);
      onCountryDetected(info);
      setDetecting(false);

      // Show zone activation toast
      const zoneMessages = {
        nigeria: "🇳🇬 Naira Zone Activated",
        africa: "🌍 Africa Member Zone – Crypto Required",
        international: "🌐 International Tier Activated",
      };
      
      toast.success(zoneMessages[zone]);
    } catch (error) {
      console.error("Country detection failed:", error);
      // Default to international
      const defaultInfo: CountryInfo = {
        country: "International",
        countryCode: "XX",
        flag: "",
        zone: "international",
        fee: 200,
        currency: "USD",
        paymentMethods: ["crypto"],
      };
      setCountryInfo(defaultInfo);
      onCountryDetected(defaultInfo);
      setDetecting(false);
      toast.error("Could not detect location. Defaulting to International.");
    }
  };

  const isAfricanCountry = (code: string): boolean => {
    const africanCountries = [
      "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG",
      "CD", "CI", "DJ", "EG", "GQ", "ER", "ET", "GA", "GM", "GH", "GN", "GW",
      "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "YT", "MA", "MZ",
      "NA", "NE", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "SZ",
      "TZ", "TG", "TN", "UG", "ZM", "ZW"
    ];
    return africanCountries.includes(code);
  };

  if (detecting) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-3 glass-card rounded-xl px-6 py-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Globe className="w-5 h-5 text-primary" />
        </motion.div>
        <span className="text-sm text-muted-foreground">Detecting your location...</span>
      </motion.div>
    );
  }

  if (!countryInfo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-xl px-6 py-4 border border-border/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {countryInfo.flag && (
            <motion.img
              src={countryInfo.flag}
              alt={countryInfo.country}
              className="w-8 h-6 rounded object-cover"
              initial={{ rotateY: 0 }}
              animate={{ rotateY: 360 }}
              transition={{ duration: 0.6 }}
            />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">{countryInfo.country}</p>
            <p className="text-xs text-muted-foreground">
              {countryInfo.zone === "nigeria" && "Naira Zone"}
              {countryInfo.zone === "africa" && "Africa Member"}
              {countryInfo.zone === "international" && "International Tier"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-foreground">
            {countryInfo.currency} {countryInfo.fee.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Enrollment Fee</p>
        </div>
      </div>

      {countryInfo.zone !== "nigeria" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 pt-3 border-t border-border/50 flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Crypto payment required for your region
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GeoDetector;
