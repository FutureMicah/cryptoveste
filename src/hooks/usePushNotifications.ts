import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationData {
  type: 'payment_approved' | 'payment_rejected' | 'referral_complete' | 'new_message' | 'payout_processed';
  title: string;
  message: string;
  data?: Record<string, any>;
}

export const usePushNotifications = (userId: string | null) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleTs3n9LYqnlSRG+m0M2YXkg0X5G4ybZxVDZBdKe9xbBpVzlCd6q/xKxlVzpDeam+w6plWDlDeai9wqpkWTpDea i9wqpkWTpDeai9wqpkWTpDeai9wqpkWTpDeai9wqpkWTpDeai9wqpkWTpDeai9');
    audioRef.current.volume = 0.5;
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, []);

  const showNotification = useCallback((notification: NotificationData) => {
    playNotificationSound();

    // Show toast notification
    switch (notification.type) {
      case 'payment_approved':
        toast.success(notification.title, {
          description: notification.message,
          duration: 8000,
          action: {
            label: 'View',
            onClick: () => window.location.href = '/dashboard',
          },
        });
        break;
      case 'payment_rejected':
        toast.error(notification.title, {
          description: notification.message,
          duration: 10000,
        });
        break;
      case 'referral_complete':
        toast.success(notification.title, {
          description: notification.message,
          duration: 8000,
          icon: '💰',
        });
        break;
      case 'new_message':
        toast.info(notification.title, {
          description: notification.message,
          duration: 5000,
          icon: '💬',
        });
        break;
      case 'payout_processed':
        toast.success(notification.title, {
          description: notification.message,
          duration: 8000,
          icon: '✅',
        });
        break;
      default:
        toast.info(notification.title, {
          description: notification.message,
          duration: 5000,
        });
    }

    // Try to show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  }, [playNotificationSound]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    // Subscribe to payment status changes
    const paymentChannel = supabase
      .channel(`payments-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status;
          const oldStatus = (payload.old as any).status;
          
          if (newStatus !== oldStatus) {
            if (newStatus === 'completed') {
              showNotification({
                type: 'payment_approved',
                title: '🎉 Payment Approved!',
                message: 'Your payment has been verified. Welcome to BlackPAL!',
              });
            } else if (newStatus === 'rejected') {
              showNotification({
                type: 'payment_rejected',
                title: '⚠️ Payment Rejected',
                message: 'Please resubmit your payment proof.',
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to referral completions (profile earnings updates)
    const referralChannel = supabase
      .channel(`referrals-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newEarnings = (payload.new as any).total_earnings;
          const oldEarnings = (payload.old as any).total_earnings;
          
          if (newEarnings > oldEarnings) {
            const earned = newEarnings - oldEarnings;
            showNotification({
              type: 'referral_complete',
              title: '💰 Referral Commission!',
              message: `You just earned ₦${earned.toLocaleString()}! Total: ₦${newEarnings.toLocaleString()}`,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to support messages
    const messagesChannel = supabase
      .channel(`messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const senderType = (payload.new as any).sender_type;
          if (senderType === 'admin') {
            showNotification({
              type: 'new_message',
              title: '💬 New Support Message',
              message: 'You have a new message from support.',
            });
          }
        }
      )
      .subscribe();

    // Subscribe to payout updates
    const payoutChannel = supabase
      .channel(`payouts-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payouts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).status;
          const oldStatus = (payload.old as any).status;
          const amount = (payload.new as any).amount;
          
          if (newStatus !== oldStatus) {
            if (newStatus === 'completed') {
              showNotification({
                type: 'payout_processed',
                title: '✅ Payout Processed!',
                message: `₦${amount?.toLocaleString() || '0'} has been sent to your bank account.`,
              });
            } else if (newStatus === 'rejected') {
              showNotification({
                type: 'payment_rejected',
                title: '⚠️ Payout Declined',
                message: 'Your payout request was declined. Check your dashboard for details.',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentChannel);
      supabase.removeChannel(referralChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(payoutChannel);
    };
  }, [userId, showNotification]);

  return {
    requestPermission,
    showNotification,
  };
};

export default usePushNotifications;
