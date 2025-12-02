-- Add payment account name verification fields
ALTER TABLE public.payment_proofs
ADD COLUMN IF NOT EXISTS payment_account_name TEXT,
ADD COLUMN IF NOT EXISTS name_verification_status TEXT DEFAULT 'pending' CHECK (name_verification_status IN ('pending', 'verified', 'failed'));

-- Add full name to profiles (make them required for KYC)
COMMENT ON COLUMN public.profiles.first_name IS 'User first name for KYC verification';
COMMENT ON COLUMN public.profiles.last_name IS 'User last name for KYC verification';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_proofs_verification_status 
ON public.payment_proofs(name_verification_status, status);