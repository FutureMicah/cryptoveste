import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ActionType = 
  | 'login'
  | 'logout'
  | 'page_view'
  | 'signup_start'
  | 'signup_complete'
  | 'payment_started'
  | 'payment_completed'
  | 'screenshot_uploaded'
  | 'referral_link_clicked'
  | 'profile_updated'
  | 'document_uploaded';

interface LogOptions {
  description?: string;
  metadata?: Record<string, any>;
}

export const useActivityLog = () => {
  const lastLoggedPage = useRef<string | null>(null);

  const logActivity = useCallback(async (
    actionType: ActionType, 
    options?: LogOptions
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action_type: actionType,
        action_description: options?.description,
        page_url: window.location.pathname,
        metadata: options?.metadata || {},
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }, []);

  const logPageView = useCallback(async (pageName?: string) => {
    const currentPath = window.location.pathname;
    
    // Prevent duplicate logs for same page
    if (lastLoggedPage.current === currentPath) return;
    lastLoggedPage.current = currentPath;

    await logActivity('page_view', { 
      description: pageName || currentPath,
      metadata: { path: currentPath }
    });
  }, [logActivity]);

  const logLogin = useCallback(async () => {
    await logActivity('login', { description: 'User logged in' });
  }, [logActivity]);

  const logLogout = useCallback(async () => {
    await logActivity('logout', { description: 'User logged out' });
  }, [logActivity]);

  return { logActivity, logPageView, logLogin, logLogout };
};

export default useActivityLog;
