import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, RefreshCw, Mail, Ban, CheckCircle, Globe, History, Users, Download } from "lucide-react";
import { toast } from "sonner";
import { exportUsersToCSV } from "@/utils/exportUsers";

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

interface ZoneHistory {
  id: string;
  user_id: string;
  admin_id: string;
  previous_zone: string;
  new_zone: string;
  reason: string;
  created_at: string;
}

const UsersManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkZone, setBulkZone] = useState<string>("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [zoneHistory, setZoneHistory] = useState<ZoneHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    getCurrentAdmin();
  }, []);

  const getCurrentAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentAdminId(user.id);
  };

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

  const loadZoneHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("zone_change_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setZoneHistory(data || []);
    } catch (error) {
      console.error("Error loading zone history:", error);
      toast.error("Failed to load zone history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const toggleVIP = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_vip: !currentStatus })
        .eq("id", userId);

      if (error) throw error;
      toast.success(`VIP ${!currentStatus ? "enabled" : "removed"}`);
      loadUsers();
    } catch (error) {
      toast.error("Failed to update VIP status");
    }
  };

  const updateUserZone = async (userId: string, previousZone: string, newZone: string) => {
    if (!currentAdminId) {
      toast.error("Admin not authenticated");
      return;
    }

    try {
      // Update user zone
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ geo_zone: newZone })
        .eq("id", userId);

      if (updateError) throw updateError;

      // Log zone change
      const { error: historyError } = await supabase
        .from("zone_change_history")
        .insert({
          user_id: userId,
          admin_id: currentAdminId,
          previous_zone: previousZone || "unknown",
          new_zone: newZone,
        });

      if (historyError) console.error("Failed to log zone change:", historyError);

      toast.success(`Zone → ${newZone === "nigeria" ? "Nigeria" : "International"}`);
      loadUsers();
    } catch (error) {
      toast.error("Failed to update zone");
    }
  };

  const bulkUpdateZones = async () => {
    if (!currentAdminId || !bulkZone || selectedUsers.size === 0) {
      toast.error("Select users and zone");
      return;
    }

    try {
      const selectedUsersArray = Array.from(selectedUsers);
      
      // Get previous zones for history
      const selectedUserData = users.filter(u => selectedUsers.has(u.id));
      
      // Update all selected users
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ geo_zone: bulkZone })
        .in("id", selectedUsersArray);

      if (updateError) throw updateError;

      // Log all zone changes
      const historyEntries = selectedUserData.map(user => ({
        user_id: user.id,
        admin_id: currentAdminId,
        previous_zone: user.geo_zone || "unknown",
        new_zone: bulkZone,
        reason: "Bulk update",
      }));

      await supabase.from("zone_change_history").insert(historyEntries);

      toast.success(`${selectedUsers.size} users updated to ${bulkZone === "nigeria" ? "Nigeria" : "International"}`);
      setSelectedUsers(new Set());
      setBulkDialogOpen(false);
      setBulkZone("");
      loadUsers();
    } catch (error) {
      toast.error("Bulk update failed");
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
      toast.success("Email sent");
    } catch (error) {
      toast.error("Failed to send email");
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const getCountryFlag = (countryCode: string) => {
    if (!countryCode) return null;
    return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
  };

  const getZoneBadge = (zone: string, vpnDetected: boolean) => {
    const isNigeria = zone === "nigeria";
    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
          isNigeria 
            ? "bg-green-500/20 text-green-500" 
            : "bg-blue-500/20 text-blue-500"
        }`}>
          {isNigeria ? "🇳🇬 NG" : "🌍 Intl"}
        </span>
        {vpnDetected && (
          <span className="px-1 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-500">
            VPN
          </span>
        )}
      </div>
    );
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Unknown" : userId.slice(0, 8);
  };

  const filteredUsers = users.filter(user => 
    `${user.first_name} ${user.last_name} ${user.username} ${user.referral_code}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="p-3 sm:p-4 lg:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base sm:text-lg font-bold text-foreground truncate">Users ({users.length})</h3>
          <div className="flex items-center gap-1.5">
            {/* History Button */}
            <Dialog open={historyDialogOpen} onOpenChange={(open) => {
              setHistoryDialogOpen(open);
              if (open) loadZoneHistory();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 px-2 text-xs">
                  <History className="w-3 h-3 sm:mr-1" />
                  <span className="hidden sm:inline">History</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-card">
                <DialogHeader>
                  <DialogTitle className="text-sm">Zone Change History</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[300px] pr-2">
                  {historyLoading ? (
                    <p className="text-center text-muted-foreground text-xs py-4">Loading...</p>
                  ) : zoneHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground text-xs py-4">No history</p>
                  ) : (
                    <div className="space-y-2">
                      {zoneHistory.map((entry) => (
                        <div key={entry.id} className="p-2 rounded bg-muted/50 text-xs">
                          <div className="flex justify-between items-start gap-2 flex-wrap">
                            <span className="font-medium truncate max-w-[120px]">{getUserName(entry.user_id)}</span>
                            <span className="text-muted-foreground text-[10px]">
                              {new Date(entry.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-[10px]">
                            <span className={`px-1 py-0.5 rounded ${
                              entry.previous_zone === "nigeria" ? "bg-green-500/20 text-green-500" : "bg-blue-500/20 text-blue-500"
                            }`}>
                              {entry.previous_zone === "nigeria" ? "NG" : "Intl"}
                            </span>
                            <span>→</span>
                            <span className={`px-1 py-0.5 rounded ${
                              entry.new_zone === "nigeria" ? "bg-green-500/20 text-green-500" : "bg-blue-500/20 text-blue-500"
                            }`}>
                              {entry.new_zone === "nigeria" ? "NG" : "Intl"}
                            </span>
                            {entry.reason && <span className="text-muted-foreground ml-1">({entry.reason})</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Bulk Override Button */}
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 px-2 text-xs"
                  disabled={selectedUsers.size === 0}
                >
                  <Users className="w-3 h-3 sm:mr-1" />
                  <span className="hidden sm:inline">Bulk</span>
                  {selectedUsers.size > 0 && (
                    <span className="ml-1 px-1 py-0.5 rounded bg-primary text-primary-foreground text-[10px]">
                      {selectedUsers.size}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm bg-card">
                <DialogHeader>
                  <DialogTitle className="text-sm">Bulk Zone Override</DialogTitle>
                  <DialogDescription className="text-xs">
                    Change zone for {selectedUsers.size} selected user(s).
                  </DialogDescription>
                </DialogHeader>
                <div className="py-3">
                  <Select value={bulkZone} onValueChange={setBulkZone}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="nigeria" className="text-xs">🇳🇬 Nigeria (₦50,000)</SelectItem>
                      <SelectItem value="international" className="text-xs">🌍 International ($50 USDT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button size="sm" onClick={bulkUpdateZones} disabled={!bulkZone} className="h-8 text-xs">
                    Update {selectedUsers.size} Users
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* CSV Export Button */}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                exportUsersToCSV(filteredUsers);
                toast.success(`Exported ${filteredUsers.length} users to CSV`);
              }}
              disabled={filteredUsers.length === 0}
              className="h-8 px-2 text-xs"
            >
              <Download className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">CSV</span>
            </Button>

            <Button size="sm" variant="outline" onClick={loadUsers} disabled={loading} className="h-8 px-2">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-3 sm:-mx-4 lg:-mx-6">
        <div className="min-w-[600px] px-3 sm:px-4 lg:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 p-1">
                  <Checkbox
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-[10px] sm:text-xs p-1.5">Name</TableHead>
                <TableHead className="text-[10px] sm:text-xs p-1.5">User</TableHead>
                <TableHead className="text-[10px] sm:text-xs p-1.5">Zone</TableHead>
                <TableHead className="text-[10px] sm:text-xs p-1.5 hidden md:table-cell">Ref</TableHead>
                <TableHead className="text-[10px] sm:text-xs p-1.5">Earnings</TableHead>
                <TableHead className="text-[10px] sm:text-xs p-1.5">VIP</TableHead>
                <TableHead className="text-[10px] sm:text-xs p-1.5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="p-1">
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <div className="flex items-center gap-1 max-w-[80px] sm:max-w-[120px]">
                      {user.country_code && (
                        <img 
                          src={getCountryFlag(user.country_code)} 
                          alt="" 
                          className="w-3 h-2 flex-shrink-0 rounded"
                        />
                      )}
                      <span className="text-[10px] sm:text-xs truncate">
                        {user.first_name} {user.last_name?.charAt(0)}.
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="p-1.5 text-[10px] sm:text-xs truncate max-w-[60px]">
                    {user.username || "-"}
                  </TableCell>
                  <TableCell className="p-1.5">
                    {getZoneBadge(user.geo_zone, user.vpn_detected)}
                  </TableCell>
                  <TableCell className="p-1.5 font-mono text-[10px] hidden md:table-cell">
                    {user.referral_code}
                  </TableCell>
                  <TableCell className="p-1.5 text-[10px] sm:text-xs">
                    ₦{(user.total_earnings || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="p-1.5">
                    <span className={`px-1 py-0.5 rounded text-[10px] ${
                      user.is_vip 
                        ? "bg-yellow-500/20 text-yellow-500" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {user.is_vip ? "VIP" : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="p-1.5">
                    <div className="flex gap-0.5">
                      {/* Zone Override */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <Globe className="w-3 h-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xs bg-card">
                          <DialogHeader>
                            <DialogTitle className="text-sm">Zone Override</DialogTitle>
                            <DialogDescription className="text-xs">
                              {user.first_name} {user.last_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 py-2">
                            <div className="text-xs space-y-1">
                              <p><span className="text-muted-foreground">Current:</span> {user.geo_zone === "nigeria" ? "Nigeria" : "International"}</p>
                              <p><span className="text-muted-foreground">Country:</span> {user.detected_country || "Unknown"}</p>
                              {user.vpn_detected && (
                                <p className="text-yellow-500 text-[10px]">⚠️ VPN detected</p>
                              )}
                            </div>
                            <Select
                              defaultValue={user.geo_zone || "international"}
                              onValueChange={(value) => updateUserZone(user.id, user.geo_zone, value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select zone" />
                              </SelectTrigger>
                              <SelectContent className="bg-card">
                                <SelectItem value="nigeria" className="text-xs">🇳🇬 Nigeria (₦50,000)</SelectItem>
                                <SelectItem value="international" className="text-xs">🌍 International ($50)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => sendEmailToUser(user.id)}
                      >
                        <Mail className="w-3 h-3" />
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className={`h-6 w-6 p-0 ${user.is_vip ? "text-yellow-500" : ""}`}
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
      </div>

      {filteredUsers.length === 0 && (
        <p className="text-center text-muted-foreground py-6 text-xs">
          {searchTerm ? "No users match" : "No users found"}
        </p>
      )}
    </Card>
  );
};

export default UsersManagement;