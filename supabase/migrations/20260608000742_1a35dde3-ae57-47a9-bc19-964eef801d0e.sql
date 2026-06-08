
-- Admin: update deposit (amount + status) with wallet reconciliation
CREATE OR REPLACE FUNCTION public.admin_update_deposit(
  _deposit_id uuid, _new_amount numeric, _new_status text, _note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.deposits%ROWTYPE; delta numeric := 0;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO d FROM public.deposits WHERE id=_deposit_id FOR UPDATE;
  IF d IS NULL THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF _new_amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  -- Wallet reconciliation
  IF d.status='approved' AND _new_status<>'approved' THEN
    -- reverse previously credited amount
    UPDATE public.wallets SET balance_usd = GREATEST(balance_usd - d.amount_usd, 0) WHERE user_id=d.user_id;
  ELSIF d.status<>'approved' AND _new_status='approved' THEN
    INSERT INTO public.wallets(user_id) VALUES (d.user_id) ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.wallets SET balance_usd = balance_usd + _new_amount WHERE user_id=d.user_id;
  ELSIF d.status='approved' AND _new_status='approved' AND d.amount_usd <> _new_amount THEN
    delta := _new_amount - d.amount_usd;
    UPDATE public.wallets SET balance_usd = GREATEST(balance_usd + delta, 0) WHERE user_id=d.user_id;
  END IF;

  UPDATE public.deposits SET amount_usd=_new_amount, status=_new_status,
    admin_notes=COALESCE(_note,admin_notes), reviewed_by=auth.uid(), reviewed_at=now()
    WHERE id=_deposit_id;
  PERFORM public.log_admin_action('deposit_updated','deposit',_deposit_id,d.user_id,
    jsonb_build_object('from_status',d.status,'to_status',_new_status,'from_amount',d.amount_usd,'to_amount',_new_amount,'note',_note));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_deposit(_deposit_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.deposits%ROWTYPE;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO d FROM public.deposits WHERE id=_deposit_id FOR UPDATE;
  IF d IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF d.status='approved' THEN
    UPDATE public.wallets SET balance_usd = GREATEST(balance_usd - d.amount_usd, 0) WHERE user_id=d.user_id;
  END IF;
  DELETE FROM public.deposits WHERE id=_deposit_id;
  PERFORM public.log_admin_action('deposit_deleted','deposit',_deposit_id,d.user_id,
    jsonb_build_object('amount',d.amount_usd,'status',d.status));
END; $$;

-- Admin: update withdrawal
CREATE OR REPLACE FUNCTION public.admin_update_withdrawal(
  _withdrawal_id uuid, _new_amount numeric, _new_status text, _note text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.withdrawals%ROWTYPE; bal numeric;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id=_withdrawal_id FOR UPDATE;
  IF w IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF _new_amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  IF w.status IN ('approved','paid') AND _new_status NOT IN ('approved','paid') THEN
    UPDATE public.wallets SET balance_usd = balance_usd + w.amount_usd,
      total_withdrawn = GREATEST(total_withdrawn - w.amount_usd, 0) WHERE user_id=w.user_id;
  ELSIF w.status NOT IN ('approved','paid') AND _new_status IN ('approved','paid') THEN
    SELECT balance_usd INTO bal FROM public.wallets WHERE user_id=w.user_id FOR UPDATE;
    IF bal < _new_amount THEN RAISE EXCEPTION 'Insufficient balance to approve'; END IF;
    UPDATE public.wallets SET balance_usd = balance_usd - _new_amount,
      total_withdrawn = total_withdrawn + _new_amount WHERE user_id=w.user_id;
  ELSIF w.status IN ('approved','paid') AND _new_status IN ('approved','paid') AND w.amount_usd <> _new_amount THEN
    -- adjust delta
    UPDATE public.wallets SET balance_usd = balance_usd + (w.amount_usd - _new_amount),
      total_withdrawn = total_withdrawn + (_new_amount - w.amount_usd) WHERE user_id=w.user_id;
  END IF;

  UPDATE public.withdrawals SET amount_usd=_new_amount, status=_new_status,
    admin_notes=COALESCE(_note,admin_notes), reviewed_by=auth.uid(), reviewed_at=now()
    WHERE id=_withdrawal_id;
  PERFORM public.log_admin_action('withdrawal_updated','withdrawal',_withdrawal_id,w.user_id,
    jsonb_build_object('from_status',w.status,'to_status',_new_status,'from_amount',w.amount_usd,'to_amount',_new_amount,'note',_note));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_withdrawal(_withdrawal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.withdrawals%ROWTYPE;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id=_withdrawal_id FOR UPDATE;
  IF w IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF w.status IN ('approved','paid') THEN
    UPDATE public.wallets SET balance_usd = balance_usd + w.amount_usd,
      total_withdrawn = GREATEST(total_withdrawn - w.amount_usd, 0) WHERE user_id=w.user_id;
  END IF;
  DELETE FROM public.withdrawals WHERE id=_withdrawal_id;
  PERFORM public.log_admin_action('withdrawal_deleted','withdrawal',_withdrawal_id,w.user_id,
    jsonb_build_object('amount',w.amount_usd,'status',w.status));
END; $$;

-- Admin: update user profile (audit)
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  _user_id uuid, _first_name text, _last_name text, _username text,
  _phone text, _country text, _avatar_url text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.profiles SET
    first_name = COALESCE(_first_name, first_name),
    last_name  = COALESCE(_last_name, last_name),
    username   = COALESCE(_username, username),
    phone      = COALESCE(_phone, phone),
    country    = COALESCE(_country, country),
    avatar_url = COALESCE(_avatar_url, avatar_url),
    updated_at = now()
  WHERE id = _user_id;
  PERFORM public.log_admin_action('profile_updated','profile',NULL,_user_id,
    jsonb_build_object('first_name',_first_name,'last_name',_last_name,'username',_username,
                       'phone',_phone,'country',_country,'avatar_url',_avatar_url));
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_update_deposit(uuid,numeric,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_deposit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_withdrawal(uuid,numeric,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_withdrawal(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid,text,text,text,text,text,text) FROM anon;
