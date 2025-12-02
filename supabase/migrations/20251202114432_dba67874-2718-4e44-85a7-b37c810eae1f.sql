-- Add VPN detection and enhanced geo tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS detected_country TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS vpn_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS geo_zone TEXT CHECK (geo_zone IN ('nigeria', 'africa', 'international'));

-- Create investor KYC documents table
CREATE TABLE IF NOT EXISTS public.investor_kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('government_id', 'proof_of_address', 'bank_statement', 'tax_document', 'source_of_funds')),
  document_id UUID REFERENCES public.document_uploads(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'requires_resubmission')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create interview scheduling table
CREATE TABLE IF NOT EXISTS public.admin_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_by UUID REFERENCES auth.users(id),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  meeting_link TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show')),
  notes TEXT,
  compliance_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add crypto payment tracking
CREATE TABLE IF NOT EXISTS public.crypto_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id),
  cryptocurrency TEXT NOT NULL CHECK (cryptocurrency IN ('USDT_TRC20', 'USDT_ERC20', 'BTC', 'ETH', 'USDC')),
  wallet_address TEXT NOT NULL,
  expected_amount NUMERIC NOT NULL,
  transaction_hash TEXT,
  network TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirming', 'confirmed', 'failed')),
  confirmations INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add Skrill and Flutterwave payment tracking
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'paystack' CHECK (payment_provider IN ('paystack', 'flutterwave', 'skrill', 'crypto', 'bank_transfer'));

-- Enable RLS on new tables
ALTER TABLE public.investor_kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investor_kyc_documents
CREATE POLICY "Users can view own KYC documents"
  ON public.investor_kyc_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KYC documents"
  ON public.investor_kyc_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all KYC documents"
  ON public.investor_kyc_documents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for admin_interviews
CREATE POLICY "Users can view own interviews"
  ON public.admin_interviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all interviews"
  ON public.admin_interviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for crypto_payments
CREATE POLICY "Users can view own crypto payments"
  ON public.crypto_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crypto payments"
  ON public.crypto_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all crypto payments"
  ON public.crypto_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can view all payment proofs for verification
CREATE POLICY "Admins can view all payment proofs"
  ON public.payment_proofs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_status ON public.investor_kyc_documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_interviews_user_status ON public.admin_interviews(user_id, status);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_user_status ON public.crypto_payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_tx_hash ON public.crypto_payments(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status_name_verification ON public.payment_proofs(status, name_verification_status);

-- Add triggers for updated_at
CREATE TRIGGER update_investor_kyc_documents_updated_at
  BEFORE UPDATE ON public.investor_kyc_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_interviews_updated_at
  BEFORE UPDATE ON public.admin_interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crypto_payments_updated_at
  BEFORE UPDATE ON public.crypto_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();