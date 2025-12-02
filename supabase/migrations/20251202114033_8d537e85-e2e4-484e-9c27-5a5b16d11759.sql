-- Update handle_new_user function to properly store first and last names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, telegram_id, username, referral_code)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    (NEW.raw_user_meta_data->>'telegram_id')::BIGINT,
    NEW.raw_user_meta_data->>'username',
    generate_referral_code()
  );
  RETURN NEW;
END;
$function$;