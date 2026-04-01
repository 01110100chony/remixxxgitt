
-- 1. Add user_id to programs (alongside existing created_by)
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
-- Backfill user_id from created_by
UPDATE public.programs SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_programs_user_id ON public.programs(user_id);

-- 2. Add program_id to all child tables
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE;
ALTER TABLE public.orientations ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE;
ALTER TABLE public.technical_productions ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE;
ALTER TABLE public.reviewer_activities ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE;
ALTER TABLE public.researcher_metrics ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE;
ALTER TABLE public.citation_entries ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_articles_program_id ON public.articles(program_id);
CREATE INDEX IF NOT EXISTS idx_orientations_program_id ON public.orientations(program_id);
CREATE INDEX IF NOT EXISTS idx_projects_program_id ON public.projects(program_id);
CREATE INDEX IF NOT EXISTS idx_technical_productions_program_id ON public.technical_productions(program_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_activities_program_id ON public.reviewer_activities(program_id);
CREATE INDEX IF NOT EXISTS idx_researcher_metrics_program_id ON public.researcher_metrics(program_id);
CREATE INDEX IF NOT EXISTS idx_citation_entries_program_id ON public.citation_entries(program_id);

-- 3. Update RLS on programs
DROP POLICY IF EXISTS "Authenticated users can view programs" ON public.programs;
DROP POLICY IF EXISTS "Coordinators and admins can manage programs" ON public.programs;

CREATE POLICY "Users can view own programs" ON public.programs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = created_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own programs" ON public.programs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own programs" ON public.programs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own programs" ON public.programs FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- 4. Refresh RLS on all child tables to ensure user_id isolation
-- RESEARCHERS (already done in previous migration, just verify)

-- ARTICLES
DROP POLICY IF EXISTS "Users can view own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can insert own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can update own articles" ON public.articles;
DROP POLICY IF EXISTS "Users can delete own articles" ON public.articles;

CREATE POLICY "Users can view own articles" ON public.articles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own articles" ON public.articles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own articles" ON public.articles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own articles" ON public.articles FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- ORIENTATIONS
DROP POLICY IF EXISTS "Users can view own orientations" ON public.orientations;
DROP POLICY IF EXISTS "Users can insert own orientations" ON public.orientations;
DROP POLICY IF EXISTS "Users can update own orientations" ON public.orientations;
DROP POLICY IF EXISTS "Users can delete own orientations" ON public.orientations;

CREATE POLICY "Users can view own orientations" ON public.orientations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own orientations" ON public.orientations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orientations" ON public.orientations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own orientations" ON public.orientations FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- PROJECTS
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- TECHNICAL_PRODUCTIONS
DROP POLICY IF EXISTS "Users can view own technical_productions" ON public.technical_productions;
DROP POLICY IF EXISTS "Users can insert own technical_productions" ON public.technical_productions;
DROP POLICY IF EXISTS "Users can update own technical_productions" ON public.technical_productions;
DROP POLICY IF EXISTS "Users can delete own technical_productions" ON public.technical_productions;

CREATE POLICY "Users can view own technical_productions" ON public.technical_productions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own technical_productions" ON public.technical_productions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own technical_productions" ON public.technical_productions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own technical_productions" ON public.technical_productions FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- REVIEWER_ACTIVITIES
DROP POLICY IF EXISTS "Users can view own reviewer_activities" ON public.reviewer_activities;
DROP POLICY IF EXISTS "Users can insert own reviewer_activities" ON public.reviewer_activities;
DROP POLICY IF EXISTS "Users can update own reviewer_activities" ON public.reviewer_activities;
DROP POLICY IF EXISTS "Users can delete own reviewer_activities" ON public.reviewer_activities;

CREATE POLICY "Users can view own reviewer_activities" ON public.reviewer_activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own reviewer_activities" ON public.reviewer_activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviewer_activities" ON public.reviewer_activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own reviewer_activities" ON public.reviewer_activities FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- RESEARCHER_METRICS
DROP POLICY IF EXISTS "Users can view own metrics" ON public.researcher_metrics;
DROP POLICY IF EXISTS "Users can insert own metrics" ON public.researcher_metrics;
DROP POLICY IF EXISTS "Users can update own metrics" ON public.researcher_metrics;
DROP POLICY IF EXISTS "Users can delete own metrics" ON public.researcher_metrics;

CREATE POLICY "Users can view own metrics" ON public.researcher_metrics FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own metrics" ON public.researcher_metrics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metrics" ON public.researcher_metrics FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own metrics" ON public.researcher_metrics FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- CITATION_ENTRIES
DROP POLICY IF EXISTS "Users can view own citations" ON public.citation_entries;
DROP POLICY IF EXISTS "Users can insert own citations" ON public.citation_entries;
DROP POLICY IF EXISTS "Users can update own citations" ON public.citation_entries;
DROP POLICY IF EXISTS "Users can delete own citations" ON public.citation_entries;

CREATE POLICY "Users can view own citations" ON public.citation_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own citations" ON public.citation_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own citations" ON public.citation_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own citations" ON public.citation_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
