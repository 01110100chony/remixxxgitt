
CREATE TABLE public.planning_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(program_id, type)
);

ALTER TABLE public.planning_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view planning data"
ON public.planning_data FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Coordinators and admins can insert planning data"
ON public.planning_data FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

CREATE POLICY "Coordinators and admins can update planning data"
ON public.planning_data FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

CREATE POLICY "Coordinators and admins can delete planning data"
ON public.planning_data FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

CREATE TRIGGER update_planning_data_updated_at
BEFORE UPDATE ON public.planning_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
