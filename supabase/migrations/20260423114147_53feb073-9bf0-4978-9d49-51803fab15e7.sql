-- Normalize existing journal_metrics rows: dedupe by (issn, year) keeping the most recent.
-- Use a NULL-safe expression so rows with NULL year still collapse correctly.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY issn, COALESCE(year, -1)
           ORDER BY updated_at DESC, created_at DESC
         ) AS rn
  FROM public.journal_metrics
)
DELETE FROM public.journal_metrics
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Unique index supporting ON CONFLICT (issn, year) including NULL year.
CREATE UNIQUE INDEX IF NOT EXISTS journal_metrics_issn_year_key
  ON public.journal_metrics (issn, COALESCE(year, -1));
