import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, RefreshCw, Mail, Ban, CheckCircle, Globe, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  referral_code: string;
  detected_country: string;
  country_code: string;
  geo_zone: string;
  total_earnings: number;
  is_vip: boolean;
  vpn_detected: boolean;
  ip_address: string;
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

  const updateUserZone = async (userId: string, newZone: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ geo_zone: newZone })
        .eq("id", userId);

      if (error) throw error;
      toast.success(`User zone updated to ${newZone === "nigeria" ? "Nigeria (₦50,000)" : "International ($50 USDT)"}`);
      loadUsers();
    } catch (error) {
      toast.error("Failed to update user zone");
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

  const getZoneBadge = (zone: string, vpnDetected: boolean) => {
    const isNigeria = zone === "nigeria";
    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          isNigeria 
            ? "bg-green-500/20 text-green-500" 
            : "bg-blue-500/20 text-blue-500"
        }`}>
          {isNigeria ? "🇳🇬 Nigeria" : "🌍 International"}
        </span>
        {vpnDetected && (
          <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-500">
            VPN
          </span>
        )}
      </div>
    );
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
              <TableHead>Zone</TableHead>
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
                <TableCell>
                  {getZoneBadge(user.geo_zone, user.vpn_detected)}
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
                    {/* Zone Override Dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" title="Change Zone">
                          <Globe className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Override User Zone</DialogTitle>
                          <DialogDescription>
                            Change the payment zone for {user.first_name} {user.last_name}. 
                            This will affect which payment methods they see.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              <strong>Current Zone:</strong> {user.geo_zone === "nigeria" ? "Nigeria (₦50,000)" : "International ($50 USDT)"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <strong>Detected Country:</strong> {user.detected_country || "Unknown"}
                            </p>
                            {user.ip_address && (
                              <p className="text-sm text-muted-foreground">
                                <strong>IP Address:</strong> {user.ip_address}
                              </p>
                            )}
                            {user.vpn_detected && (
                              <p className="text-sm text-yellow-500">
                                ⚠️ VPN/Proxy was detected for this user
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Select New Zone:</label>
                            <Select
                              defaultValue={user.geo_zone || "international"}
                              onValueChange={(value) => updateUserZone(user.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select zone" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nigeria">
                                  <div className="flex items-center gap-2">
                                    <span>🇳🇬</span>
                                    <span>Nigeria (₦50,000 - Paystack)</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="international">
                                  <div className="flex items-center gap-2">
                                    <span>🌍</span>
                                    <span>International ($50 USDT)</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => sendEmailToUser(user.id)}
                      title="Send Email"
                    >
                      <Mail className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant={user.is_vip ? "destructive" : "default"}
                      onClick={() => toggleVIP(user.id, user.is_vip)}
                      title={user.is_vip ? "Remove VIP" : "Make VIP"}
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
