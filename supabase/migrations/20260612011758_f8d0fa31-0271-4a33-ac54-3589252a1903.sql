
CREATE OR REPLACE FUNCTION public.log_kyc_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email text;
  _action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _action := 'kyc_submitted';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      _action := 'kyc_' || NEW.status;
    ELSE
      _action := 'kyc_resubmitted';
    END IF;
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = COALESCE(NEW.reviewed_by, auth.uid());

  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, target_type, target_id, target_user_id, details)
  VALUES (
    COALESCE(NEW.reviewed_by, auth.uid()),
    _email,
    _action,
    'user_kyc',
    NEW.id,
    NEW.user_id,
    jsonb_build_object(
      'full_name', NEW.full_name,
      'id_type', NEW.id_type,
      'status', NEW.status,
      'rejection_reason', NEW.rejection_reason
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_kyc_event ON public.user_kyc;
CREATE TRIGGER trg_log_kyc_event
AFTER INSERT OR UPDATE ON public.user_kyc
FOR EACH ROW EXECUTE FUNCTION public.log_kyc_event();
