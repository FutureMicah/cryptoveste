
CREATE OR REPLACE FUNCTION public.distribute_due_roi()
RETURNS TABLE(investment_id uuid, credited numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  elapsed numeric;
  total_seconds numeric;
  target_paid numeric;
  delta numeric;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR inv IN
    SELECT * FROM public.user_investments WHERE status = 'active' FOR UPDATE
  LOOP
    total_seconds := GREATEST(EXTRACT(EPOCH FROM (inv.ends_at - inv.starts_at)), 1);
    elapsed := LEAST(EXTRACT(EPOCH FROM (now() - inv.starts_at)), total_seconds);
    -- profit only (expected_return = principal + profit). We pay back principal + profit pro-rata.
    target_paid := inv.expected_return * (elapsed / total_seconds);
    delta := GREATEST(target_paid - inv.total_paid, 0);

    IF delta > 0 THEN
      UPDATE public.wallets
        SET balance_usd = balance_usd + delta,
            total_earned = total_earned + delta
        WHERE user_id = inv.user_id;

      UPDATE public.user_investments
        SET total_paid = total_paid + delta,
            status = CASE WHEN total_paid + delta >= expected_return OR now() >= ends_at THEN 'completed' ELSE status END,
            updated_at = now()
        WHERE id = inv.id;

      investment_id := inv.id;
      credited := delta;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;
