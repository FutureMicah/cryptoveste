-- Fix search_path for generate_referral_code function
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix search_path for update_referral_earnings function
CREATE OR REPLACE FUNCTION update_referral_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.referral_code_used IS NOT NULL THEN
    -- Update referrer's earnings
    UPDATE public.profiles
    SET total_earnings = total_earnings + 5000
    WHERE referral_code = NEW.referral_code_used;
    
    -- Update referral status
    UPDATE public.referrals
    SET status = 'completed', completed_at = NOW()
    WHERE payment_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;