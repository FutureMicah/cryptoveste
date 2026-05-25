
-- ============ PROFILE ADDITIONS ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- ============ DEPOSIT ADDRESSES ============
CREATE TABLE IF NOT EXISTS public.deposit_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL,
  network text NOT NULL,
  address text NOT NULL,
  qr_url text,
  min_amount numeric NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deposit_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view active addresses"
  ON public.deposit_addresses FOR SELECT TO authenticated
  USING (is_active = true OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins manage deposit addresses"
  ON public.deposit_addresses FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

INSERT INTO public.deposit_addresses (currency, network, address, min_amount, sort_order) VALUES
  ('USDT','BEP20','0x37e39CcC88bfcD0a78087DD1188619530C355a95',10,1),
  ('USDT','TRC20','TXYZreplace_with_real_TRC20_address',10,2),
  ('BTC','Bitcoin','bc1qreplace_with_real_btc_address',20,3),
  ('ETH','ERC20','0xreplace_with_real_eth_address',20,4)
ON CONFLICT DO NOTHING;

-- ============ USER KYC ============
CREATE TABLE IF NOT EXISTS public.user_kyc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  dob date,
  country text,
  id_type text NOT NULL,
  id_number text NOT NULL,
  id_front_url text,
  id_back_url text,
  selfie_url text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_kyc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own kyc" ON public.user_kyc FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own kyc" ON public.user_kyc FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Users update own pending kyc" ON public.user_kyc FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending','rejected'));
CREATE POLICY "Admins view all kyc" ON public.user_kyc FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins update kyc" ON public.user_kyc FOR UPDATE
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE TRIGGER user_kyc_updated_at BEFORE UPDATE ON public.user_kyc
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MANUAL ADJUSTMENTS ============
CREATE TABLE IF NOT EXISTS public.manual_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  reason text,
  kind text NOT NULL DEFAULT 'credit', -- credit | debit
  admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.manual_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own adjustments" ON public.manual_adjustments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all adjustments" ON public.manual_adjustments FOR SELECT
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins insert adjustments" ON public.manual_adjustments FOR INSERT
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- ============ ANNOUNCEMENTS ============
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL DEFAULT 'info', -- info | success | warning | critical
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active announcements"
  ON public.announcements FOR SELECT
  USING (is_active = true OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admins manage announcements"
  ON public.announcements FOR ALL
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents','kyc-documents', false) ON CONFLICT (id) DO NOTHING;

-- avatars: public read, user can upload to own folder
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- kyc: private, user own folder + admin read all
CREATE POLICY "Users read own kyc files" ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read all kyc files" ON storage.objects FOR SELECT
  USING (bucket_id = 'kyc-documents' AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')));
CREATE POLICY "Users upload own kyc files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own kyc files" ON storage.objects FOR UPDATE
  USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ ADMIN ACTION FUNCTIONS ============

-- Adjust balance (credit or debit)
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  _user_id uuid, _amount numeric, _reason text, _kind text DEFAULT 'credit'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bal numeric;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;

  IF _kind = 'credit' THEN
    UPDATE public.wallets SET balance_usd = balance_usd + _amount WHERE user_id = _user_id;
  ELSIF _kind = 'debit' THEN
    SELECT balance_usd INTO bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
    IF bal < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    UPDATE public.wallets SET balance_usd = balance_usd - _amount WHERE user_id = _user_id;
  ELSE
    RAISE EXCEPTION 'Invalid kind';
  END IF;

  INSERT INTO public.manual_adjustments (user_id, amount_usd, reason, kind, admin_id)
    VALUES (_user_id, _amount, _reason, _kind, auth.uid());
END;
$$;

-- Create investment for a user (bypasses wallet check; admin gift / migration)
CREATE OR REPLACE FUNCTION public.admin_create_investment(
  _user_id uuid, _plan_id uuid, _amount numeric
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  plan_row public.investment_plans%ROWTYPE;
  new_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO plan_row FROM public.investment_plans WHERE id = _plan_id AND is_active = true;
  IF plan_row IS NULL THEN RAISE EXCEPTION 'Plan not available'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_investments (user_id, plan_id, amount, expected_return, starts_at, ends_at, status, total_paid)
  VALUES (
    _user_id, _plan_id, _amount,
    _amount * (1 + plan_row.roi_percent / 100.0),
    now(),
    now() + (plan_row.duration_days || ' days')::interval,
    'active', 0
  ) RETURNING id INTO new_id;

  UPDATE public.wallets SET total_invested = total_invested + _amount WHERE user_id = _user_id;
  RETURN new_id;
END;
$$;

-- Cancel an active investment and refund remaining principal portion
CREATE OR REPLACE FUNCTION public.admin_cancel_investment(_investment_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.user_investments%ROWTYPE;
  refund numeric;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO inv FROM public.user_investments WHERE id = _investment_id FOR UPDATE;
  IF inv IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF inv.status <> 'active' THEN RAISE EXCEPTION 'Investment not active'; END IF;

  -- Refund principal (or remaining principal after profit already paid)
  refund := GREATEST(inv.amount - GREATEST(inv.total_paid - (inv.expected_return - inv.amount), 0), 0);

  UPDATE public.wallets
    SET balance_usd = balance_usd + refund
    WHERE user_id = inv.user_id;

  UPDATE public.user_investments
    SET status = 'cancelled', updated_at = now()
    WHERE id = _investment_id;
END;
$$;

-- Admin can create an already-approved deposit (manual top up logged as deposit)
CREATE OR REPLACE FUNCTION public.admin_credit_deposit(_user_id uuid, _amount numeric, _note text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.deposits (user_id, amount_usd, status, admin_notes, reviewed_by, reviewed_at)
    VALUES (_user_id, _amount, 'approved', COALESCE(_note,'Manual admin top-up'), auth.uid(), now());
END;
$$;
