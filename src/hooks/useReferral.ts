import { useState, useEffect } from 'react';

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

    // Get or generate user's own referral code
    let myCode = localStorage.getItem('myReferralCode');
    if (!myCode) {
      myCode = generateReferralCode();
      localStorage.setItem('myReferralCode', myCode);
    }
    setUserReferralCode(myCode);
  }, []);

  const isValidReferralCode = (code: string): boolean => {
    // Valid if it's alphanumeric and between 4-12 characters
    return /^[A-Z0-9]{4,12}$/.test(code.toUpperCase());
  };

  const generateReferralCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const processPayment = (username: string) => {
    const appliedCode = localStorage.getItem('appliedReferralCode');
    
    if (appliedCode) {
      // Update referrer's data
      const referrerKey = `referral_${appliedCode}`;
      const referrerData: ReferralData = JSON.parse(
        localStorage.getItem(referrerKey) || '{"code":"","referrals":[],"earnings":0}'
      );
      
      referrerData.code = appliedCode;
      referrerData.referrals.push(username);
      referrerData.earnings += 5000;
      
      localStorage.setItem(referrerKey, JSON.stringify(referrerData));
      
      // Clear applied code after use
      localStorage.removeItem('appliedReferralCode');
    }
  };

  const getReferralLink = (): string => {
    return `https://blackpal-ascend.lovable.app/?ref=${userReferralCode}`;
  };

  const getReferralStats = (): ReferralData => {
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
