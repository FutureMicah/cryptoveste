import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReferralData {
  code: string;
  referrals: string[];
  earnings: number;
}

export const useReferral = () => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [userReferralCode, setUserReferralCode] = useState<string>('');

  useEffect(() => {
    // Check URL for ref parameter
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    
    if (refCode && isValidReferralCode(refCode)) {
      setReferralCode(refCode);
      setHasDiscount(true);
      localStorage.setItem('appliedReferralCode', refCode);
    }

    // Load user's referral code from database if authenticated
    loadUserReferralCode();
  }, []);

  const loadUserReferralCode = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();
      
      if (profile?.referral_code) {
        setUserReferralCode(profile.referral_code);
        return;
      }
    }

    // Fallback to localStorage for non-authenticated users
    let myCode = localStorage.getItem('myReferralCode');
    if (!myCode) {
      myCode = generateReferralCode();
      localStorage.setItem('myReferralCode', myCode);
    }
    setUserReferralCode(myCode);
  };

  const isValidReferralCode = (code: string): boolean => {
    // Valid if it's alphanumeric and between 4-12 characters
    return /^[A-Z0-9]{4,12}$/i.test(code);
  };

  const generateReferralCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const processPayment = async (userId: string, paymentId?: string) => {
    const appliedCode = localStorage.getItem('appliedReferralCode');
    
    if (appliedCode) {
      try {
        // Find the referrer by their referral code
        const { data: referrer } = await supabase
          .from('profiles')
          .select('id, total_earnings')
          .eq('referral_code', appliedCode.toUpperCase())
          .single();

        if (referrer) {
          // Create referral record
          await supabase
            .from('referrals')
            .insert({
              referrer_id: referrer.id,
              referee_id: userId,
              payment_id: paymentId,
              amount: 5000,
              status: 'completed',
              completed_at: new Date().toISOString(),
            });

          // Update referrer's earnings
          await supabase
            .from('profiles')
            .update({ 
              total_earnings: (referrer.total_earnings || 0) + 5000
            })
            .eq('id', referrer.id);
        }
      } catch (error) {
        console.error('Error processing referral:', error);
      }
      
      // Clear applied code after use
      localStorage.removeItem('appliedReferralCode');
    }
  };

  const getReferralLink = (): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/signup?ref=${userReferralCode}`;
  };

  const getReferralStats = (): ReferralData => {
    // This is now handled by the database, but keep for backward compatibility
    const key = `referral_${userReferralCode}`;
    return JSON.parse(
      localStorage.getItem(key) || '{"code":"","referrals":[],"earnings":0}'
    );
  };

  return {
    referralCode,
    hasDiscount,
    userReferralCode,
    processPayment,
    getReferralLink,
    getReferralStats,
  };
};
