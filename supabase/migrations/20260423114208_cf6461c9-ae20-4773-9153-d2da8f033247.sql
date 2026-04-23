DROP INDEX IF EXISTS public.journal_metrics_issn_year_key;

CREATE UNIQUE INDEX journal_metrics_issn_year_key
  ON public.journal_metrics (issn, year) NULLS NOT DISTINCT;
