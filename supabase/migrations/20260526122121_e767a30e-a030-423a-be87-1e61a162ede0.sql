
-- Audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  target_user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit log" ON public.admin_audit_log FOR SELECT
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON public.admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target_user ON public.admin_audit_log(target_user_id);

-- Logger (callable by admins only). Records auth.uid() as actor.
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text,
  _target_type text DEFAULT NULL,
  _target_id uuid DEFAULT NULL,
  _target_user_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id uuid;
  _email text;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target_type, target_id, target_user_id, details)
    VALUES (auth.uid(), _email, _action, _target_type, _target_id, _target_user_id, COALESCE(_details,'{}'::jsonb))
    RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_admin_action(text,text,uuid,uuid,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text,text,uuid,uuid,jsonb) TO authenticated;

-- Wrap existing admin RPCs to also log
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user_id uuid, _amount numeric, _reason text, _kind text DEFAULT 'credit')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE bal numeric;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  IF _kind = 'credit' THEN
    UPDATE public.wallets SET balance_usd = balance_usd + _amount WHERE user_id = _user_id;
  ELSIF _kind = 'debit' THEN
    SELECT balance_usd INTO bal FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
    IF bal < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    UPDATE public.wallets SET balance_usd = balance_usd - _amount WHERE user_id = _user_id;
  ELSE RAISE EXCEPTION 'Invalid kind'; END IF;
  INSERT INTO public.manual_adjustments (user_id, amount_usd, reason, kind, admin_id)
    VALUES (_user_id, _amount, _reason, _kind, auth.uid());
  PERFORM public.log_admin_action('balance_adjustment','wallet',NULL,_user_id,
    jsonb_build_object('amount',_amount,'kind',_kind,'reason',_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_credit_deposit(_user_id uuid, _amount numeric, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE new_dep uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.deposits (user_id, amount_usd, status, admin_notes, reviewed_by, reviewed_at)
    VALUES (_user_id, _amount, 'approved', COALESCE(_note,'Manual admin top-up'), auth.uid(), now())
    RETURNING id INTO new_dep;
  PERFORM public.log_admin_action('manual_deposit','deposit',new_dep,_user_id,
    jsonb_build_object('amount',_amount,'note',_note));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_investment(_user_id uuid, _plan_id uuid, _amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE plan_row public.investment_plans%ROWTYPE; new_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO plan_row FROM public.investment_plans WHERE id = _plan_id AND is_active = true;
  IF plan_row IS NULL THEN RAISE EXCEPTION 'Plan not available'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;
  INSERT INTO public.wallets (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_investments (user_id, plan_id, amount, expected_return, starts_at, ends_at, status, total_paid)
  VALUES (_user_id, _plan_id, _amount,
    _amount * (1 + plan_row.roi_percent / 100.0), now(),
    now() + (plan_row.duration_days || ' days')::interval, 'active', 0)
  RETURNING id INTO new_id;
  UPDATE public.wallets SET total_invested = total_invested + _amount WHERE user_id = _user_id;
  PERFORM public.log_admin_action('investment_created','investment',new_id,_user_id,
    jsonb_build_object('amount',_amount,'plan',plan_row.name,'roi_percent',plan_row.roi_percent));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cancel_investment(_investment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inv public.user_investments%ROWTYPE; refund numeric;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO inv FROM public.user_investments WHERE id = _investment_id FOR UPDATE;
  IF inv IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF inv.status <> 'active' THEN RAISE EXCEPTION 'Investment not active'; END IF;
  refund := GREATEST(inv.amount - GREATEST(inv.total_paid - (inv.expected_return - inv.amount), 0), 0);
  UPDATE public.wallets SET balance_usd = balance_usd + refund WHERE user_id = inv.user_id;
  UPDATE public.user_investments SET status = 'cancelled', updated_at = now() WHERE id = _investment_id;
  PERFORM public.log_admin_action('investment_cancelled','investment',_investment_id,inv.user_id,
    jsonb_build_object('refund',refund,'original_amount',inv.amount));
END;
$$;
