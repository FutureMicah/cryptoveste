import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Search, RefreshCw, Mail, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  referral_code: string;
  detected_country: string;
  country_code: string;
  total_earnings: number;
  is_vip: boolean;
  created_at: string;
  email?: string;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const toggleVIP = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_vip: !currentStatus })
        .eq("id", userId);

      if (error) throw error;
      toast.success(`User ${!currentStatus ? "marked as VIP" : "VIP status removed"}`);
      loadUsers();
    } catch (error) {
      toast.error("Failed to update VIP status");
    }
  };

  const sendEmailToUser = async (userId: string) => {
    try {
      await supabase.functions.invoke("send-notification", {
        body: {
          userId,
          type: "payment_approved",
          data: { amount: "Welcome" },
        },
      });
      toast.success("Email sent successfully");
    } catch (error) {
      toast.error("Failed to send email");
    }
  };

  const getCountryFlag = (countryCode: string) => {
    if (!countryCode) return null;
    return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
  };

  const filteredUsers = users.filter(user => 
    `${user.first_name} ${user.last_name} ${user.username} ${user.referral_code}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-foreground">All Users</h3>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Referral Code</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>VIP</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.first_name} {user.last_name}
                </TableCell>
                <TableCell>{user.username || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.country_code && (
                      <img 
                        src={getCountryFlag(user.country_code)} 
                        alt="" 
                        className="w-4 h-3 rounded"
                      />
                    )}
                    {user.detected_country || "-"}
                  </div>
                </TableCell>
                <TableCell className="font-mono">{user.referral_code}</TableCell>
                <TableCell>₦{user.total_earnings?.toLocaleString() || 0}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.is_vip 
                      ? "bg-yellow-500/20 text-yellow-500" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {user.is_vip ? "VIP" : "Standard"}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => sendEmailToUser(user.id)}
                    >
                      <Mail className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant={user.is_vip ? "destructive" : "default"}
                      onClick={() => toggleVIP(user.id, user.is_vip)}
                    >
                      {user.is_vip ? <Ban className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredUsers.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          {searchTerm ? "No users match your search" : "No users found"}
        </p>
      )}
    </Card>
  );
};

export default UsersManagement;
