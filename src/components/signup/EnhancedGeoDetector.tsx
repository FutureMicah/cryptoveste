import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface CountryInfo {
  country: string;
  countryCode: string;
  flag: string;
  zone: "nigeria" | "africa" | "international";
  fee: number;
  currency: string;
  paymentMethods: string[];
  ipAddress: string;
  vpnDetected: boolean;
}

interface EnhancedGeoDetectorProps {
  onCountryDetected: (info: CountryInfo) => void;
  blockVPN?: boolean;
}

const EnhancedGeoDetector = ({ onCountryDetected, blockVPN = true }: EnhancedGeoDetectorProps) => {
  const [detecting, setDetecting] = useState(true);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [vpnBlocked, setVpnBlocked] = useState(false);

  useEffect(() => {
    detectCountryAndVPN();
  }, []);

  const detectCountryAndVPN = async () => {
    try {
      // Use multiple IP geolocation services for VPN detection
      const [ipApiResponse, vpnApiResponse] = await Promise.allSettled([
        fetch("https://ipapi.co/json/"),
        fetch("https://vpnapi.io/api/", {
          headers: { 'Accept': 'application/json' }
        })
      ]);

      let ipData: any = null;
      let vpnData: any = null;

      if (ipApiResponse.status === 'fulfilled') {
        ipData = await ipApiResponse.value.json();
      }

      if (vpnApiResponse.status === 'fulfilled') {
        vpnData = await vpnApiResponse.value.json();
      }

      // Check for VPN/Proxy
      const isVPN = vpnData?.security?.vpn === true || 
                    vpnData?.security?.proxy === true ||
                    ipData?.threat?.is_proxy === true ||
                    ipData?.threat?.is_anonymous === true;

      if (isVPN && blockVPN) {
        setVpnBlocked(true);
        toast.error("VPN/Proxy Detected", {
          description: "Please disable your VPN or proxy to continue. This is required for security and compliance.",
          duration: 10000,
        });
        setDetecting(false);
        return;
      }

      const countryCode = ipData?.country_code || "NG";
      const country = ipData?.country_name || "Nigeria";
      const ipAddress = ipData?.ip || vpnData?.ip || "Unknown";

      // Determine zone and pricing
      let zone: "nigeria" | "africa" | "international";
      let fee: number;
      let currency: string;
      let paymentMethods: string[];

      if (countryCode === "NG") {
        zone = "nigeria";
        fee = 25000;
        currency = "₦";
        paymentMethods = ["paystack", "bank_transfer", "crypto"];
      } else if (isAfricanCountry(countryCode)) {
        zone = "africa";
        fee = 100;
        currency = "$";
        paymentMethods = ["flutterwave", "crypto", "skrill"];
      } else {
        zone = "international";
        fee = 200;
        currency = "$";
        paymentMethods = ["crypto", "skrill"];
      }

      const info: CountryInfo = {
        country,
        countryCode,
        flag: `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`,
        zone,
        fee,
        currency,
        paymentMethods,
        ipAddress,
        vpnDetected: isVPN,
      };

      setCountryInfo(info);
      onCountryDetected(info);

      // Save geo data to profile
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        await supabase
          .from("profiles")
          .update({
            country_code: countryCode,
            detected_country: country,
            ip_address: ipAddress,
            vpn_detected: isVPN,
            geo_zone: zone,
          })
          .eq("id", user.data.user.id);
      }

      toast.success(`${zone.toUpperCase()} Zone Activated`, {
        description: `Fee: ${currency}${fee.toLocaleString()}`,
      });

      setDetecting(false);
    } catch (error) {
      console.error("Geo detection error:", error);
      toast.error("Location detection failed, defaulting to International");
      
      // Default to international
      const defaultInfo: CountryInfo = {
        country: "International",
        countryCode: "XX",
        flag: "🌍",
        zone: "international",
        fee: 200,
        currency: "$",
        paymentMethods: ["crypto", "skrill"],
        ipAddress: "Unknown",
        vpnDetected: false,
      };
      
      setCountryInfo(defaultInfo);
      onCountryDetected(defaultInfo);
      setDetecting(false);
    }
  };

  const isAfricanCountry = (code: string): boolean => {
    const africanCountries = [
      "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG",
      "CD", "CI", "DJ", "EG", "GQ", "ER", "ET", "GA", "GM", "GH", "GN", "GW",
      "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "YT", "MA", "MZ",
      "NA", "NE", "NG", "RE", "RW", "SH", "ST", "SN", "SC", "SL", "SO", "ZA",
      "SS", "SD", "SZ", "TZ", "TG", "TN", "UG", "EH", "ZM", "ZW"
    ];
    return africanCountries.includes(code);
  };

  if (vpnBlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-xl p-6 border-2 border-red-500/50 bg-red-500/10"
      >
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              VPN/Proxy Detected - Access Blocked
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              For security and compliance reasons, you must disable your VPN or proxy service to access this platform.
            </p>
            <button
              onClick={() => {
                setVpnBlocked(false);
                setDetecting(true);
                detectCountryAndVPN();
              }}
              className="text-sm text-primary hover:underline font-medium"
            >
              ↻ Retry Connection
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (detecting) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex items-center gap-4">
          <Globe className="w-8 h-8 text-primary animate-spin" />
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Detecting Your Location...
            </h3>
            <p className="text-sm text-muted-foreground">
              Verifying region for pricing • Checking for VPN/Proxy
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!countryInfo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-xl p-6 border border-primary/30"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {countryInfo.flag.startsWith('http') ? (
            <img src={countryInfo.flag} alt="" className="w-10 h-7 rounded shadow" />
          ) : (
            <div className="text-3xl">{countryInfo.flag}</div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold text-foreground">
              {countryInfo.country}
            </h3>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium">Zone:</span> {countryInfo.zone.toUpperCase()}
            </p>
            <p className="text-primary font-bold text-lg">
              Enrollment Fee: {countryInfo.currency}{countryInfo.fee.toLocaleString()}
            </p>
            {countryInfo.vpnDetected && (
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                <Shield className="w-4 h-4" />
                <span className="text-xs">VPN detected but allowed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedGeoDetector;
