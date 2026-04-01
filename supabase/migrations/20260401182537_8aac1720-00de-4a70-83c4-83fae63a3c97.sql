
CREATE TABLE public.evaluation_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'simplified',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(program_id, mode)
);

ALTER TABLE public.evaluation_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view evaluation_weights"
  ON public.evaluation_weights FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Coordinators and admins can manage evaluation_weights"
  ON public.evaluation_weights FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

CREATE TRIGGER update_evaluation_weights_updated_at
  BEFORE UPDATE ON public.evaluation_weights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
