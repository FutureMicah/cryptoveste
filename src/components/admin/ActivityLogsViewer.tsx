import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Search, Activity, LogIn, Eye, CreditCard, Upload, Users } from "lucide-react";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  action_description: string;
  page_url: string;
  metadata: any;
  created_at: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
}

const ActivityLogsViewer = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterType !== "all") {
        query = query.eq("action_type", filterType);
      }

      const { data, error } = await query;
      if (error) throw error;

      setLogs(data || []);

      // Fetch user profiles
      const userIds = [...new Set((data || []).map(log => log.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, username")
          .in("id", userIds);

        const userMap = new Map<string, UserProfile>();
        (profiles || []).forEach(p => userMap.set(p.id, p));
        setUsers(userMap);
      }
    } catch (error) {
      console.error("Error loading activity logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case "login":
      case "logout":
        return <LogIn className="w-3 h-3" />;
      case "page_view":
        return <Eye className="w-3 h-3" />;
      case "payment_started":
      case "payment_completed":
        return <CreditCard className="w-3 h-3" />;
      case "screenshot_uploaded":
      case "document_uploaded":
        return <Upload className="w-3 h-3" />;
      case "signup_start":
      case "signup_complete":
        return <Users className="w-3 h-3" />;
      default:
        return <Activity className="w-3 h-3" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case "login":
        return "bg-green-500/20 text-green-500";
      case "logout":
        return "bg-gray-500/20 text-gray-400";
      case "payment_completed":
        return "bg-emerald-500/20 text-emerald-500";
      case "payment_started":
        return "bg-yellow-500/20 text-yellow-500";
      case "signup_complete":
        return "bg-blue-500/20 text-blue-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getUserName = (userId: string) => {
    const user = users.get(userId);
    if (user) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || userId.slice(0, 8);
    }
    return userId.slice(0, 8);
  };

  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    const userName = getUserName(log.user_id).toLowerCase();
    const description = (log.action_description || "").toLowerCase();
    return userName.includes(searchLower) || description.includes(searchLower) || log.action_type.includes(searchLower);
  });

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Activity Logs ({logs.length})
          </h3>
          <Button size="sm" variant="outline" onClick={loadLogs} disabled={loading} className="h-7 text-xs">
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all" className="text-xs">All</SelectItem>
              <SelectItem value="login" className="text-xs">Logins</SelectItem>
              <SelectItem value="page_view" className="text-xs">Page Views</SelectItem>
              <SelectItem value="payment_completed" className="text-xs">Payments</SelectItem>
              <SelectItem value="signup_complete" className="text-xs">Signups</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <p className="text-center text-muted-foreground text-xs py-8">No activity logs found</p>
        ) : (
          <div className="space-y-1.5">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-2">
                  <div className={`p-1 rounded ${getActionColor(log.action_type)}`}>
                    {getActionIcon(log.action_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground truncate">
                        {getUserName(log.user_id)}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {log.action_description || log.action_type.replace(/_/g, " ")}
                    </p>
                    {log.page_url && (
                      <p className="text-[10px] text-muted-foreground/70 truncate">
                        {log.page_url}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};

export default ActivityLogsViewer;
