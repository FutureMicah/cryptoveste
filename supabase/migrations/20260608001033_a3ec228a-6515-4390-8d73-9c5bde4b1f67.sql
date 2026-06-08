
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, telegram_id, username, phone, country, referral_code)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NULLIF(NEW.raw_user_meta_data->>'telegram_id','')::BIGINT,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'country',
    generate_referral_code()
  );
  RETURN NEW;
END;
$$;
