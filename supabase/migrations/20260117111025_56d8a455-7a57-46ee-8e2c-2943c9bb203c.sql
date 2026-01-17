-- Create zone change history table
CREATE TABLE public.zone_change_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  previous_zone TEXT,
  new_zone TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.zone_change_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all zone history
CREATE POLICY "Admins can view zone history" 
ON public.zone_change_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can insert zone history
CREATE POLICY "Admins can insert zone history" 
ON public.zone_change_history 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_zone_change_history_user_id ON public.zone_change_history(user_id);
CREATE INDEX idx_zone_change_history_created_at ON public.zone_change_history(created_at DESC);