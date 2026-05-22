
-- ============ TABLES ============

CREATE TABLE public.investment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  min_amount numeric NOT NULL DEFAULT 0,
  max_amount numeric NOT NULL DEFAULT 0,
  roi_percent numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance_usd numeric NOT NULL DEFAULT 0,
  total_invested numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  tx_hash text,
  sender_wallet text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  wallet_address text NOT NULL,
  network text DEFAULT 'BEP20',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  tx_hash text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.investment_plans(id),
  amount numeric NOT NULL,
  expected_return numeric NOT NULL,
  total_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ RLS ============
ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_investments ENABLE ROW LEVEL SECURITY;

-- plans: public read, admin manage
CREATE POLICY "Plans are viewable by everyone" ON public.investment_plans FOR SELECT USING (true);
CREATE POLICY "Admins manage plans" ON public.investment_plans FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- wallets
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all wallets" ON public.wallets FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins update wallets" ON public.wallets FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- deposits
CREATE POLICY "Users view own deposits" ON public.deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins view all deposits" ON public.deposits FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins update deposits" ON public.deposits FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- withdrawals
CREATE POLICY "Users view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins view all withdrawals" ON public.withdrawals FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins update withdrawals" ON public.withdrawals FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- user_investments
CREATE POLICY "Users view own investments" ON public.user_investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own investments" ON public.user_investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all investments" ON public.user_investments FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins update investments" ON public.user_investments FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- ============ FUNCTIONS / TRIGGERS ============

-- updated_at triggers
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.investment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_investments_updated BEFORE UPDATE ON public.user_investments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create wallet on signup (extend handle_new_user)
CREATE OR REPLACE FUNCTION public.ensure_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_wallet_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.ensure_wallet();

-- Backfill wallets for any existing users
INSERT INTO public.wallets (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Deposit approval -> credit wallet
CREATE OR REPLACE FUNCTION public.handle_deposit_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.wallets
      SET balance_usd = balance_usd + NEW.amount_usd
      WHERE user_id = NEW.user_id;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deposit_status
BEFORE UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.handle_deposit_status();

-- Withdrawal approval -> debit wallet (only when moving to approved or paid first time)
CREATE OR REPLACE FUNCTION public.handle_withdrawal_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_balance numeric;
BEGIN
  IF NEW.status IN ('approved','paid') AND OLD.status NOT IN ('approved','paid') THEN
    SELECT balance_usd INTO wallet_balance FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;
    IF wallet_balance < NEW.amount_usd THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    UPDATE public.wallets
      SET balance_usd = balance_usd - NEW.amount_usd,
          total_withdrawn = total_withdrawn + NEW.amount_usd
      WHERE user_id = NEW.user_id;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_withdrawal_status
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.handle_withdrawal_status();

-- New investment -> deduct wallet
CREATE OR REPLACE FUNCTION public.handle_new_investment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_balance numeric;
  plan_row public.investment_plans%ROWTYPE;
BEGIN
  SELECT * INTO plan_row FROM public.investment_plans WHERE id = NEW.plan_id;
  IF plan_row IS NULL OR NOT plan_row.is_active THEN
    RAISE EXCEPTION 'Plan not available';
  END IF;
  IF NEW.amount < plan_row.min_amount OR (plan_row.max_amount > 0 AND NEW.amount > plan_row.max_amount) THEN
    RAISE EXCEPTION 'Amount outside plan range';
  END IF;

  SELECT balance_usd INTO wallet_balance FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;
  IF wallet_balance IS NULL OR wallet_balance < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  NEW.expected_return := NEW.amount * (1 + plan_row.roi_percent / 100.0);
  NEW.ends_at := now() + (plan_row.duration_days || ' days')::interval;
  NEW.status := 'active';

  UPDATE public.wallets
    SET balance_usd = balance_usd - NEW.amount,
        total_invested = total_invested + NEW.amount
    WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_investment
BEFORE INSERT ON public.user_investments
FOR EACH ROW EXECUTE FUNCTION public.handle_new_investment();

-- Admin: credit ROI to user wallet for an investment
CREATE OR REPLACE FUNCTION public.credit_investment_roi(_investment_id uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.user_investments%ROWTYPE;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO inv FROM public.user_investments WHERE id = _investment_id FOR UPDATE;
  IF inv IS NULL THEN RAISE EXCEPTION 'Investment not found'; END IF;

  UPDATE public.wallets
    SET balance_usd = balance_usd + _amount,
        total_earned = total_earned + _amount
    WHERE user_id = inv.user_id;

  UPDATE public.user_investments
    SET total_paid = total_paid + _amount,
        status = CASE WHEN total_paid + _amount >= expected_return THEN 'completed' ELSE status END,
        updated_at = now()
    WHERE id = _investment_id;
END;
$$;

-- ============ STORAGE: make payment-screenshots accessible ============
-- bucket already exists (payment-screenshots, private). Add policies for users + admins.
CREATE POLICY "Users upload own deposit screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-screenshots' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own deposit screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-screenshots' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins view all deposit screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-screenshots' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')));

-- ============ SEED PLANS ============
INSERT INTO public.investment_plans (name, description, min_amount, max_amount, roi_percent, duration_days, sort_order) VALUES
  ('Starter', 'Perfect for beginners exploring crypto investing.', 50, 499, 8, 14, 1),
  ('Bronze', 'Steady growth for cautious investors.', 500, 1999, 15, 21, 2),
  ('Silver', 'Balanced returns for mid-level investors.', 2000, 9999, 25, 30, 3),
  ('Gold', 'Premium plan with maximum returns.', 10000, 100000, 40, 45, 4);
