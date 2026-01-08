import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, AlertTriangle, Shield, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import VerificationCheckmark from "./VerificationCheckmark";

export interface CountryInfo {
  country: string;
  countryCode: string;
  flag: string;
  zone: "nigeria" | "international";
  fee: number;
  currency: string;
  paymentMethods: string[];
  ipAddress: string;
  vpnDetected: boolean;
  city?: string;
  region?: string;
  isp?: string;
}

interface EnhancedGeoDetectorProps {
  onCountryDetected: (info: CountryInfo) => void;
  blockVPN?: boolean;
}

// Multiple geo services for reliability
const GEO_SERVICES = [
  { url: "https://ipapi.co/json/", parser: (d: any) => ({ 
    country: d.country_name, 
    countryCode: d.country_code, 
    ip: d.ip, 
    city: d.city, 
    region: d.region,
    isp: d.org 
  })},
  { url: "https://ipwho.is/", parser: (d: any) => ({ 
    country: d.country, 
    countryCode: d.country_code, 
    ip: d.ip, 
    city: d.city, 
    region: d.region,
    isp: d.connection?.isp 
  })},
  { url: "https://ip-api.com/json/?fields=status,country,countryCode,city,region,isp,query", parser: (d: any) => ({ 
    country: d.country, 
    countryCode: d.countryCode, 
    ip: d.query, 
    city: d.city, 
    region: d.region,
    isp: d.isp 
  })},
];

const EnhancedGeoDetector = ({ onCountryDetected, blockVPN = true }: EnhancedGeoDetectorProps) => {
  const [detecting, setDetecting] = useState(true);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [vpnBlocked, setVpnBlocked] = useState(false);
  const [detectionPhase, setDetectionPhase] = useState<"locating" | "verifying" | "complete">("locating");

  useEffect(() => {
    detectCountryAndVPN();
  }, []);

  const detectCountryAndVPN = async () => {
    setDetectionPhase("locating");
    
    try {
      // Try multiple geo services for reliability
      let geoData: any = null;
      
      for (const service of GEO_SERVICES) {
        try {
          const response = await fetch(service.url, { 
            signal: AbortSignal.timeout(5000) 
          });
          if (response.ok) {
            const data = await response.json();
            geoData = service.parser(data);
            if (geoData.countryCode) break;
          }
        } catch {
          continue;
        }
      }

      setDetectionPhase("verifying");
      
      // Check for VPN/Proxy using multiple indicators
      let isVPN = false;
      
      try {
        // Check vpnapi.io for VPN detection
        const vpnResponse = await fetch(`https://vpnapi.io/api/${geoData?.ip}`, {
          signal: AbortSignal.timeout(3000)
        });
        if (vpnResponse.ok) {
          const vpnData = await vpnResponse.json();
          isVPN = vpnData?.security?.vpn === true || 
                  vpnData?.security?.proxy === true ||
                  vpnData?.security?.tor === true;
        }
      } catch {
        // VPN check failed, continue without it
      }

      if (isVPN && blockVPN) {
        setVpnBlocked(true);
        toast.error("VPN/Proxy Detected", {
          description: "Please disable your VPN or proxy to continue. This is required for security and compliance.",
          duration: 10000,
        });
        setDetecting(false);
        return;
      }

      const countryCode = geoData?.countryCode || "XX";
      const country = geoData?.country || "International";
      const ipAddress = geoData?.ip || "Unknown";

      // Simplified zone detection: Nigeria = Naira, Everyone else = $50 USDT or Telegram Stars
      let zone: "nigeria" | "international";
      let fee: number;
      let currency: string;
      let paymentMethods: string[];

      if (countryCode === "NG") {
        zone = "nigeria";
        fee = 25000;
        currency = "₦";
        paymentMethods = ["paystack"]; // Only Paystack for Nigerians
      } else {
        zone = "international";
        fee = 50;
        currency = "$";
        paymentMethods = ["crypto", "telegram_stars"]; // USDT or Telegram Stars for non-Nigerians
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
        city: geoData?.city,
        region: geoData?.region,
        isp: geoData?.isp,
      };

      setDetectionPhase("complete");
      setCountryInfo(info);
      
      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 800));
      
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

      toast.success(`${zone === "nigeria" ? "Nigeria" : "International"} Zone Activated`, {
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
        fee: 50,
        currency: "$",
        paymentMethods: ["crypto", "telegram_stars"],
        ipAddress: "Unknown",
        vpnDetected: false,
      };
      
      setCountryInfo(defaultInfo);
      onCountryDetected(defaultInfo);
      setDetecting(false);
    }
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6 border border-border/50"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <Globe className="w-10 h-10 text-primary" />
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-10 h-10 text-primary/30" />
            </motion.div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-1">
              {detectionPhase === "locating" ? "Detecting Your Location..." : "Verifying Connection..."}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <motion.div
                className={`w-2 h-2 rounded-full ${detectionPhase === "locating" ? "bg-primary" : "bg-green-500"}`}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
              <span>{detectionPhase === "locating" ? "Identifying region & IP" : "Checking VPN/Proxy"}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!countryInfo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-xl p-6 border border-green-500/30 bg-green-500/5"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {countryInfo.flag.startsWith('http') ? (
            <motion.img 
              src={countryInfo.flag} 
              alt="" 
              className="w-12 h-8 rounded shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            />
          ) : (
            <div className="text-4xl">{countryInfo.flag}</div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <VerificationCheckmark size="sm" playSound={true} />
            <h3 className="text-lg font-bold text-foreground">
              {countryInfo.country}
            </h3>
          </div>
          <div className="space-y-2 text-sm">
            {countryInfo.city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{countryInfo.city}{countryInfo.region ? `, ${countryInfo.region}` : ''}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Zone: <span className="text-foreground font-medium">{countryInfo.zone === "nigeria" ? "NIGERIA" : "INTERNATIONAL"}</span>
              </span>
            </div>
            <motion.p 
              className="text-primary font-bold text-xl"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              Enrollment Fee: {countryInfo.currency}{countryInfo.fee.toLocaleString()}
            </motion.p>
            {countryInfo.zone === "international" && (
              <p className="text-xs text-muted-foreground">
                💎 Pay with USDT (BEP20) or Telegram Stars
              </p>
            )}
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
