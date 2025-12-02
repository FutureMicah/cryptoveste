import { Card } from "@/components/ui/card";
import { Users, DollarSign, Clock, CheckCircle } from "lucide-react";

interface QuickStatsProps {
  pendingPayments: number;
  pendingKYC: number;
  scheduledInterviews: number;
  totalUsers: number;
}

const QuickStats = ({ 
  pendingPayments, 
  pendingKYC, 
  scheduledInterviews,
  totalUsers 
}: QuickStatsProps) => {
  const stats = [
    {
      label: "Pending Payments",
      value: pendingPayments,
      icon: DollarSign,
      color: "text-yellow-600 dark:text-yellow-400"
    },
    {
      label: "Pending KYC",
      value: pendingKYC,
      icon: CheckCircle,
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      label: "Scheduled Interviews",
      value: scheduledInterviews,
      icon: Clock,
      color: "text-purple-600 dark:text-purple-400"
    },
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "text-green-600 dark:text-green-400"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
              <Icon className={`w-8 h-8 ${stat.color}`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default QuickStats;
