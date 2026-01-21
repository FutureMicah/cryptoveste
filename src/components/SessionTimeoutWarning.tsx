import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

interface SessionTimeoutWarningProps {
  show: boolean;
  remainingTime: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

const SessionTimeoutWarning = ({
  show,
  remainingTime,
  onStayLoggedIn,
  onLogout,
}: SessionTimeoutWarningProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-md mx-4 text-center shadow-2xl"
          >
            <div className="mb-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-16 h-16 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center"
              >
                <Clock className="w-8 h-8 text-yellow-500" />
              </motion.div>
            </div>

            <h2 className="text-xl font-bold text-foreground mb-2">
              Session Expiring Soon
            </h2>
            <p className="text-muted-foreground mb-4">
              You've been inactive. Your session will expire in:
            </p>

            <motion.div
              className="text-4xl font-bold text-yellow-500 mb-6"
              animate={{ opacity: remainingTime <= 30 ? [1, 0.5, 1] : 1 }}
              transition={{ duration: 0.5, repeat: remainingTime <= 30 ? Infinity : 0 }}
            >
              {formatTime(remainingTime)}
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onStayLoggedIn}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Stay Logged In
              </Button>
              <Button
                onClick={onLogout}
                variant="outline"
                className="flex-1"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out Now
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SessionTimeoutWarning;
