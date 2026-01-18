import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Users, DollarSign, TrendingUp, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { exportReferralsToCSV } from "@/utils/exportUsers";

const ReferralsManagement = () => {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [topReferrers, setTopReferrers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    completedReferrals: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferrals();
    loadTopReferrers();
  }, []);

  const loadReferrals = async () => {
    try {
      const { data, error } = await supabase
        .from("referrals")
        .select(`
          *,
          referrer:referrer_id (first_name, last_name, referral_code),
          referee:referee_id (first_name, last_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setReferrals(data || []);
      
      const completed = (data || []).filter(r => r.status === "completed").length;
      const earnings = (data || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      
      setStats({
        totalReferrals: data?.length || 0,
        completedReferrals: completed,
        totalEarnings: earnings,
      });
    } catch (error) {
      console.error("Error loading referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopReferrers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, referral_code, total_earnings")
        .gt("total_earnings", 0)
        .order("total_earnings", { ascending: false })
        .limit(10);

      if (error) throw error;
      setTopReferrers(data || []);
    } catch (error) {
      console.error("Error loading top referrers:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalReferrals}</p>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-500">{stats.completedReferrals}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Paid Out</p>
              <p className="text-2xl font-bold text-foreground">₦{stats.totalEarnings.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Top Referrers */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">🏆 Top Referrers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {topReferrers.map((referrer, index) => (
            <div 
              key={referrer.id} 
              className={`p-4 rounded-lg text-center ${
                index === 0 ? "bg-yellow-500/20 border border-yellow-500/40" :
                index === 1 ? "bg-gray-400/20 border border-gray-400/40" :
                index === 2 ? "bg-amber-600/20 border border-amber-600/40" :
                "bg-muted"
              }`}
            >
              <p className="text-2xl font-bold mb-1">#{index + 1}</p>
              <p className="font-medium text-foreground">
                {referrer.first_name} {referrer.last_name}
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                {referrer.referral_code}
              </p>
              <p className="text-lg font-bold text-green-500 mt-2">
                ₦{referrer.total_earnings?.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Referrals Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-bold text-foreground">Recent Referrals</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                exportReferralsToCSV(referrals);
                toast.success("Referrals exported to CSV");
              }}
              disabled={referrals.length === 0}
              className="h-8 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLoading(true);
                loadReferrals();
                loadTopReferrers();
              }}
              className="h-8 text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Referrer</TableHead>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Referee</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map((referral) => (
                <TableRow key={referral.id}>
                  <TableCell className="font-medium text-xs">
                    {referral.referrer?.first_name} {referral.referrer?.last_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {referral.referrer?.referral_code}
                  </TableCell>
                  <TableCell className="text-xs">
                    {referral.referee?.first_name} {referral.referee?.last_name}
                  </TableCell>
                  <TableCell className="text-xs">₦{referral.amount?.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      referral.status === "completed" 
                        ? "bg-green-500/20 text-green-500"
                        : "bg-yellow-500/20 text-yellow-500"
                    }`}>
                      {referral.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(referral.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default ReferralsManagement;
