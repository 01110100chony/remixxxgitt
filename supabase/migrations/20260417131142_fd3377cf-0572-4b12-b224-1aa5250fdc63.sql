-- Journal metrics (SNIP, SJR, CiteScore by ISSN)
CREATE TABLE public.journal_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issn TEXT NOT NULL,
  journal TEXT,
  snip NUMERIC,
  sjr NUMERIC,
  citescore NUMERIC,
  year INTEGER,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_metrics_issn ON public.journal_metrics(issn);

ALTER TABLE public.journal_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view journal_metrics"
  ON public.journal_metrics FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Coordinators can manage journal_metrics"
  ON public.journal_metrics FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

CREATE TRIGGER update_journal_metrics_updated_at
  BEFORE UPDATE ON public.journal_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Other productions (artistic/cultural and other)
CREATE TABLE public.other_productions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  researcher_id UUID NOT NULL,
  program_id UUID,
  user_id UUID,
  category TEXT NOT NULL DEFAULT 'other',
  type TEXT,
  title TEXT,
  description TEXT,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_other_productions_researcher ON public.other_productions(researcher_id);
CREATE INDEX idx_other_productions_program ON public.other_productions(program_id);

ALTER TABLE public.other_productions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own other_productions"
  ON public.other_productions FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

CREATE POLICY "Users can insert own other_productions"
  ON public.other_productions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own other_productions"
  ON public.other_productions FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

CREATE POLICY "Users can delete own other_productions"
  ON public.other_productions FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));