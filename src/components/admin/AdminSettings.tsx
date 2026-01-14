import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, CreditCard, MessageCircle, Bell, Save, 
  Globe, Link, DollarSign, Send, Bitcoin
} from "lucide-react";
import { toast } from "sonner";

interface AdminSettingsProps {
  onSave?: () => void;
}

const AdminSettings = ({ onSave }: AdminSettingsProps) => {
  const [settings, setSettings] = useState({
    // Payment Settings
    nigeriaFee: "35000",
    africaFee: "50",
    internationalFee: "50",
    paystackEnabled: true,
    cryptoEnabled: true,
    telegramStarsEnabled: true,
    usdtWalletAddress: "0xYourWalletAddressHere",
    usdtNetwork: "BEP20",
    
    // Group & Channel Links
    telegramGroup: "https://t.me/+J0p7oeR8r4k3Yjg0",
    telegramChannel: "https://t.me/BLACKTRADEACADEMYfreechannel",
    telegramBot: "https://t.me/BlackPAL_bot",
    supportUsername: "@Futuremicah",
    
    // Notification Settings
    emailNotifications: true,
    paymentAlerts: true,
    newUserAlerts: true,
    kycAlerts: true,
    adminEmail: "futuremicah4@gmail.com",
    
    // Bank Details (Nigeria)
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("adminSettings");
    if (savedSettings) {
      try {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      } catch (e) {
        console.error("Failed to parse saved settings:", e);
      }
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage for now (in production, save to Supabase)
      localStorage.setItem("adminSettings", JSON.stringify(settings));
      toast.success("Settings saved successfully!");
      onSave?.();
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Admin Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure payment methods, links, and notifications
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save All"}
        </Button>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto gap-1">
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2">
            <Link className="w-4 h-4" />
            <span className="hidden sm:inline">Links</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="bank" className="gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Bank</span>
          </TabsTrigger>
        </TabsList>

        {/* Payment Settings */}
        <TabsContent value="payments" className="space-y-4 mt-4">
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Enrollment Fees by Region
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nigeria (₦)</Label>
                <Input
                  type="number"
                  value={settings.nigeriaFee}
                  onChange={(e) => setSettings({...settings, nigeriaFee: e.target.value})}
                  placeholder="35000"
                />
              </div>
              <div className="space-y-2">
                <Label>Africa - Non-NG ($)</Label>
                <Input
                  type="number"
                  value={settings.africaFee}
                  onChange={(e) => setSettings({...settings, africaFee: e.target.value})}
                  placeholder="50"
                />
              </div>
              <div className="space-y-2">
                <Label>International ($)</Label>
                <Input
                  type="number"
                  value={settings.internationalFee}
                  onChange={(e) => setSettings({...settings, internationalFee: e.target.value})}
                  placeholder="50"
                />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Methods
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Paystack (Nigeria)</p>
                  <p className="text-sm text-muted-foreground">Card payments for Nigerian users</p>
                </div>
                <Switch
                  checked={settings.paystackEnabled}
                  onCheckedChange={(checked) => setSettings({...settings, paystackEnabled: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">USDT (BEP20)</p>
                  <p className="text-sm text-muted-foreground">Crypto payments for international users</p>
                </div>
                <Switch
                  checked={settings.cryptoEnabled}
                  onCheckedChange={(checked) => setSettings({...settings, cryptoEnabled: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Telegram Stars</p>
                  <p className="text-sm text-muted-foreground">Pay via Telegram bot</p>
                </div>
                <Switch
                  checked={settings.telegramStarsEnabled}
                  onCheckedChange={(checked) => setSettings({...settings, telegramStarsEnabled: checked})}
                />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bitcoin className="w-4 h-4" />
              Crypto Wallet Settings
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>USDT Wallet Address</Label>
                <Input
                  value={settings.usdtWalletAddress}
                  onChange={(e) => setSettings({...settings, usdtWalletAddress: e.target.value})}
                  placeholder="0x..."
                />
              </div>
              <div className="space-y-2">
                <Label>Network</Label>
                <Input
                  value={settings.usdtNetwork}
                  onChange={(e) => setSettings({...settings, usdtNetwork: e.target.value})}
                  placeholder="BEP20"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Links Settings */}
        <TabsContent value="links" className="space-y-4 mt-4">
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Telegram Links
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Private Trading Group</Label>
                <Input
                  value={settings.telegramGroup}
                  onChange={(e) => setSettings({...settings, telegramGroup: e.target.value})}
                  placeholder="https://t.me/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Free Channel</Label>
                <Input
                  value={settings.telegramChannel}
                  onChange={(e) => setSettings({...settings, telegramChannel: e.target.value})}
                  placeholder="https://t.me/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Bot</Label>
                <Input
                  value={settings.telegramBot}
                  onChange={(e) => setSettings({...settings, telegramBot: e.target.value})}
                  placeholder="https://t.me/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Support Username</Label>
                <Input
                  value={settings.supportUsername}
                  onChange={(e) => setSettings({...settings, supportUsername: e.target.value})}
                  placeholder="@username"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notification Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive all email alerts</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Payment Alerts</p>
                  <p className="text-sm text-muted-foreground">Alert when new payment proof is submitted</p>
                </div>
                <Switch
                  checked={settings.paymentAlerts}
                  onCheckedChange={(checked) => setSettings({...settings, paymentAlerts: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New User Alerts</p>
                  <p className="text-sm text-muted-foreground">Alert when new user signs up</p>
                </div>
                <Switch
                  checked={settings.newUserAlerts}
                  onCheckedChange={(checked) => setSettings({...settings, newUserAlerts: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">KYC Alerts</p>
                  <p className="text-sm text-muted-foreground">Alert when KYC documents are submitted</p>
                </div>
                <Switch
                  checked={settings.kycAlerts}
                  onCheckedChange={(checked) => setSettings({...settings, kycAlerts: checked})}
                />
              </div>
              
              <div className="pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label>Admin Email</Label>
                  <Input
                    type="email"
                    value={settings.adminEmail}
                    onChange={(e) => setSettings({...settings, adminEmail: e.target.value})}
                    placeholder="admin@example.com"
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Bank Settings (Nigeria) */}
        <TabsContent value="bank" className="space-y-4 mt-4">
          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Nigerian Bank Details
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              These details will be shown to Nigerian users for bank transfer payments
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={settings.bankName}
                  onChange={(e) => setSettings({...settings, bankName: e.target.value})}
                  placeholder="e.g. Opay, GTBank, Access Bank"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={settings.accountNumber}
                  onChange={(e) => setSettings({...settings, accountNumber: e.target.value})}
                  placeholder="10-digit account number"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input
                  value={settings.accountName}
                  onChange={(e) => setSettings({...settings, accountName: e.target.value})}
                  placeholder="Account holder name"
                />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default AdminSettings;
