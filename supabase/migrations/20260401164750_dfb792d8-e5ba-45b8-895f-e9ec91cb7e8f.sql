
ALTER TABLE public.researchers ADD COLUMN IF NOT EXISTS lattes_id text;
ALTER TABLE public.researchers ADD COLUMN IF NOT EXISTS scopus_id text;
ALTER TABLE public.researchers ADD COLUMN IF NOT EXISTS researcher_id_wos text;

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS isbn text;
