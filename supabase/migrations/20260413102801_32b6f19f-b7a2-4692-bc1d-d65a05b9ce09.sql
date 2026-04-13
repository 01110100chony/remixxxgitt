CREATE UNIQUE INDEX IF NOT EXISTS citation_entries_researcher_source_unique 
ON public.citation_entries (researcher_id, source);