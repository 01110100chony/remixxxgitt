
CREATE TABLE public.citation_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('wos', 'scopus', 'scholar', 'other')),
  source_name TEXT,
  researcher_id_wos TEXT,
  total_citations INTEGER DEFAULT 0,
  total_works INTEGER DEFAULT 0,
  h_index INTEGER,
  search_name TEXT,
  profile_link TEXT,
  reference_date DATE,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.citation_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view public citations"
ON public.citation_entries FOR SELECT TO authenticated
USING (is_public = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

CREATE POLICY "Coordinators and admins can manage citation_entries"
ON public.citation_entries FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role));

CREATE TRIGGER update_citation_entries_updated_at
BEFORE UPDATE ON public.citation_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
