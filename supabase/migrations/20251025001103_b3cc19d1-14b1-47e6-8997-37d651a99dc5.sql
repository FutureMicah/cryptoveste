-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id BIGINT UNIQUE,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  is_vip BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  stars INTEGER NOT NULL,
  currency TEXT DEFAULT 'NGN',
  payment_type TEXT NOT NULL, -- 'membership', 'vip', 'token'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  referral_code_used TEXT,
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
  amount DECIMAL(10,2) DEFAULT 5000,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referrer_id, referee_id)
);

-- Create payouts table
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'paid'
  paystack_reference TEXT,
  admin_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for payments
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for referrals
CREATE POLICY "Users can view referrals they're involved in"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "System can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true);

-- RLS Policies for payouts
CREATE POLICY "Users can view own payouts"
  ON public.payouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create payout requests"
  ON public.payouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, telegram_id, username, first_name, last_name, referral_code)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'telegram_id')::BIGINT,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    generate_referral_code()
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update referrer earnings when payment completes
CREATE OR REPLACE FUNCTION update_referral_earnings()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to update earnings on payment completion
CREATE TRIGGER on_payment_completed
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_earnings();