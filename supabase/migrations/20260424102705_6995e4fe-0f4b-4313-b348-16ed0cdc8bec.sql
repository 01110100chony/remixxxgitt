
-- Bucket privado para XMLs do Lattes
INSERT INTO storage.buckets (id, name, public)
VALUES ('lattes-xml', 'lattes-xml', false)
ON CONFLICT (id) DO NOTHING;

-- Policies: somente authenticated lê/grava arquivos do próprio programa (path = program_id/researcher_id.xml)
CREATE POLICY "Authenticated can read lattes-xml"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lattes-xml');

CREATE POLICY "Authenticated can upload lattes-xml"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lattes-xml');

CREATE POLICY "Authenticated can update lattes-xml"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lattes-xml');

CREATE POLICY "Authenticated can delete lattes-xml"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lattes-xml');

-- Colunas de controle de processamento
ALTER TABLE public.researchers
  ADD COLUMN IF NOT EXISTS lattes_xml_path text,
  ADD COLUMN IF NOT EXISTS last_processed_at timestamptz;

-- is_active + source_origin para os filhos (preservar dados manuais e marcar inativos)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_origin text NOT NULL DEFAULT 'manual';

ALTER TABLE public.orientations
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_origin text NOT NULL DEFAULT 'manual';

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_origin text NOT NULL DEFAULT 'manual';

ALTER TABLE public.technical_productions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_origin text NOT NULL DEFAULT 'manual';

ALTER TABLE public.reviewer_activities
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source_origin text NOT NULL DEFAULT 'manual';

-- Histórico de processamentos
CREATE TABLE IF NOT EXISTS public.lattes_processing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id uuid NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid,
  xml_filename text,
  xml_path text,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  deactivated_count integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lattes_processing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view processing history"
ON public.lattes_processing_history FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Coordinators can manage processing history"
ON public.lattes_processing_history FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR auth.uid() = user_id)
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role) OR auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_lattes_history_researcher ON public.lattes_processing_history(researcher_id, created_at DESC);
