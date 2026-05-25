
REVOKE EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_create_investment(uuid, uuid, numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_investment(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_credit_deposit(uuid, numeric, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_investment(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_investment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_credit_deposit(uuid, numeric, text) TO authenticated;
