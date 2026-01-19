import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TopReferrer {
  first_name: string | null;
  last_name: string | null;
  referral_code: string;
  total_earnings: number | null;
}

const ReferralLeaderboard = () => {
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopReferrers();
  }, []);

  const loadTopReferrers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, referral_code, total_earnings")
        .gt("total_earnings", 0)
        .order("total_earnings", { ascending: false })
        .limit(5);

      if (!error && data) {
        setTopReferrers(data);
      }
    } catch (err) {
      console.error("Error loading leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  const maskName = (firstName: string | null, lastName: string | null) => {
    const first = firstName || "User";
    const last = lastName || "";
    const maskedFirst = first.charAt(0) + "***";
    const maskedLast = last ? last.charAt(0) + "***" : "";
    return `${maskedFirst} ${maskedLast}`.trim();
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (topReferrers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-2xl p-4 sm:p-6 border border-primary/20"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Top Earners
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          Live
        </div>
      </div>

      <div className="space-y-2">
        {topReferrers.map((referrer, index) => (
          <motion.div
            key={referrer.referral_code}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between p-3 rounded-xl transition-all ${
              index === 0
                ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/30"
                : index === 1
                ? "bg-gradient-to-r from-gray-400/10 to-gray-300/5 border border-gray-400/20"
                : index === 2
                ? "bg-gradient-to-r from-amber-600/10 to-orange-500/5 border border-amber-600/20"
                : "bg-muted/30"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">{getRankIcon(index)}</div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {maskName(referrer.first_name, referrer.last_name)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Code: {referrer.referral_code.slice(0, 4)}****
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-500 text-sm">
                ₦{(referrer.total_earnings || 0).toLocaleString()}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-center text-muted-foreground">
          💰 Earn <span className="text-primary font-semibold">₦5,000</span> for every successful referral!
        </p>
      </div>
    </motion.div>
  );
};

export default ReferralLeaderboard;