
-- Create access_requests table
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL DEFAULT 'researcher',
  status TEXT NOT NULL DEFAULT 'pending',
  full_name TEXT NOT NULL,
  institutional_email TEXT,
  lattes_url TEXT,
  message TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.access_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Coordinators/admins can view all requests for programs they manage
CREATE POLICY "Coordinators can view program requests"
ON public.access_requests FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

-- Any authenticated user can create a request
CREATE POLICY "Users can create requests"
ON public.access_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Coordinators/admins can update requests (approve/reject)
CREATE POLICY "Coordinators can update requests"
ON public.access_requests FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

-- Add profile fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institutional_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lattes_url TEXT;

-- Trigger for updated_at
CREATE TRIGGER update_access_requests_updated_at
BEFORE UPDATE ON public.access_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Make programs viewable by all authenticated users (for search)
DROP POLICY IF EXISTS "Users can view own programs" ON public.programs;
CREATE POLICY "Authenticated users can view all programs"
ON public.programs FOR SELECT TO authenticated
USING (true);
