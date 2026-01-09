import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { DollarSign, TrendingUp, CreditCard, Wallet } from "lucide-react";

interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  pendingPayments: number;
  completedPayments: number;
  paymentsByType: Record<string, number>;
}

const PaymentsOverview = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalAmount: 0,
    pendingPayments: 0,
    completedPayments: 0,
    paymentsByType: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          profiles:user_id (first_name, last_name, detected_country, country_code)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setPayments(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentsData: any[]) => {
    const stats: PaymentStats = {
      totalPayments: paymentsData.length,
      totalAmount: 0,
      pendingPayments: 0,
      completedPayments: 0,
      paymentsByType: {},
    };

    paymentsData.forEach((payment) => {
      stats.totalAmount += Number(payment.amount) || 0;
      
      if (payment.status === "pending") {
        stats.pendingPayments++;
      } else if (payment.status === "completed") {
        stats.completedPayments++;
      }

      const type = payment.payment_type || "unknown";
      stats.paymentsByType[type] = (stats.paymentsByType[type] || 0) + 1;
    });

    setStats(stats);
  };

  const getCountryFlag = (countryCode: string) => {
    if (!countryCode) return null;
    return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Payments</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalPayments}</p>
            </div>
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">₦{stats.totalAmount.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-green-500">{stats.completedPayments}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.pendingPayments}</p>
            </div>
            <Wallet className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      {/* Payment Types Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Payment Methods</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(stats.paymentsByType).map(([type, count]) => (
            <div key={type} className="px-4 py-2 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{type.replace(/_/g, " ").toUpperCase()}</p>
              <p className="text-xl font-bold text-foreground">{count}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Payments Table */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Recent Payments</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.profiles?.first_name} {payment.profiles?.last_name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {payment.profiles?.country_code && (
                        <img 
                          src={getCountryFlag(payment.profiles.country_code)} 
                          alt="" 
                          className="w-4 h-3 rounded"
                        />
                      )}
                      {payment.profiles?.detected_country || "-"}
                    </div>
                  </TableCell>
                  <TableCell>{payment.currency} {payment.amount?.toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{payment.payment_type?.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      payment.status === "completed" 
                        ? "bg-green-500/20 text-green-500"
                        : payment.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : "bg-red-500/20 text-red-500"
                    }`}>
                      {payment.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(payment.created_at).toLocaleDateString()}
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

export default PaymentsOverview;
