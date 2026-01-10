import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, DollarSign, FileCheck, Users } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "payment_proof" | "new_user" | "kyc_document";
  message: string;
  timestamp: Date;
}

interface RealtimeNotificationsProps {
  onNewPaymentProof: () => void;
  onNewUser: () => void;
}

const RealtimeNotifications = ({ onNewPaymentProof, onNewUser }: RealtimeNotificationsProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showBell, setShowBell] = useState(false);

  useEffect(() => {
    // Subscribe to payment_proofs changes
    const paymentChannel = supabase
      .channel("payment-proofs-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payment_proofs",
        },
        (payload) => {
          console.log("New payment proof:", payload);
          const notification: Notification = {
            id: crypto.randomUUID(),
            type: "payment_proof",
            message: "New payment proof submitted",
            timestamp: new Date(),
          };
          setNotifications((prev) => [notification, ...prev.slice(0, 9)]);
          setShowBell(true);
          toast.info("🔔 New payment proof submitted!", {
            description: "Click refresh to see the new proof",
          });
          onNewPaymentProof();
        }
      )
      .subscribe();

    // Subscribe to profiles changes (new users)
    const usersChannel = supabase
      .channel("new-users-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          console.log("New user:", payload);
          const notification: Notification = {
            id: crypto.randomUUID(),
            type: "new_user",
            message: `New user registered: ${(payload.new as any).first_name || "User"}`,
            timestamp: new Date(),
          };
          setNotifications((prev) => [notification, ...prev.slice(0, 9)]);
          setShowBell(true);
          toast.info("👤 New user registered!", {
            description: `${(payload.new as any).first_name || "A user"} just signed up`,
          });
          onNewUser();
        }
      )
      .subscribe();

    // Subscribe to KYC documents
    const kycChannel = supabase
      .channel("kyc-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "investor_kyc_documents",
        },
        (payload) => {
          console.log("New KYC document:", payload);
          const notification: Notification = {
            id: crypto.randomUUID(),
            type: "kyc_document",
            message: "New KYC document submitted",
            timestamp: new Date(),
          };
          setNotifications((prev) => [notification, ...prev.slice(0, 9)]);
          setShowBell(true);
          toast.info("📄 New KYC document submitted!", {
            description: "Review the document in the KYC tab",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(kycChannel);
    };
  }, [onNewPaymentProof, onNewUser]);

  const getIcon = (type: string) => {
    switch (type) {
      case "payment_proof":
        return <DollarSign className="w-4 h-4 text-green-400" />;
      case "new_user":
        return <Users className="w-4 h-4 text-blue-400" />;
      case "kyc_document":
        return <FileCheck className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setShowBell(!showBell)}
        className="relative p-2 rounded-full hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {notifications.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center"
          >
            {notifications.length}
          </motion.span>
        )}
      </button>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showBell && notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-50"
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-foreground text-sm">Notifications</span>
              <button
                onClick={() => setNotifications([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear All
              </button>
            </div>
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-3 flex items-start gap-3 hover:bg-muted/30"
                >
                  <div className="mt-0.5">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <button
                    onClick={() => clearNotification(notification.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {showBell && notifications.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute right-0 top-12 w-64 bg-card border border-border rounded-lg shadow-lg p-4 z-50"
        >
          <p className="text-sm text-muted-foreground text-center">
            No new notifications
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default RealtimeNotifications;
