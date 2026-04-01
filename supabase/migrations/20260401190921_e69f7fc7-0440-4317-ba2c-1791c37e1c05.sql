
-- Add user_id to researchers
ALTER TABLE public.researchers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to articles
ALTER TABLE public.articles ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to orientations
ALTER TABLE public.orientations ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to projects
ALTER TABLE public.projects ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to technical_productions
ALTER TABLE public.technical_productions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to reviewer_activities
ALTER TABLE public.reviewer_activities ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to researcher_metrics
ALTER TABLE public.researcher_metrics ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to citation_entries
ALTER TABLE public.citation_entries ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_researchers_user_id ON public.researchers(user_id);
CREATE INDEX idx_articles_user_id ON public.articles(user_id);
CREATE INDEX idx_orientations_user_id ON public.orientations(user_id);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_technical_productions_user_id ON public.technical_productions(user_id);
CREATE INDEX idx_reviewer_activities_user_id ON public.reviewer_activities(user_id);
CREATE INDEX idx_researcher_metrics_user_id ON public.researcher_metrics(user_id);
CREATE INDEX idx_citation_entries_user_id ON public.citation_entries(user_id);

-- Drop old RLS policies and create new user-scoped ones

-- RESEARCHERS
DROP POLICY IF EXISTS "Authenticated users can view researchers" ON public.researchers;
DROP POLICY IF EXISTS "Coordinators and admins can manage researchers" ON public.researchers;

CREATE POLICY "Users can view own researchers" ON public.researchers FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own researchers" ON public.researchers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own researchers" ON public.researchers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own researchers" ON public.researchers FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- ARTICLES
DROP POLICY IF EXISTS "Authenticated users can view articles" ON public.articles;
DROP POLICY IF EXISTS "Coordinators and admins can manage articles" ON public.articles;

CREATE POLICY "Users can view own articles" ON public.articles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own articles" ON public.articles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own articles" ON public.articles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own articles" ON public.articles FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- ORIENTATIONS
DROP POLICY IF EXISTS "Authenticated users can view orientations" ON public.orientations;
DROP POLICY IF EXISTS "Coordinators and admins can manage orientations" ON public.orientations;

CREATE POLICY "Users can view own orientations" ON public.orientations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own orientations" ON public.orientations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orientations" ON public.orientations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own orientations" ON public.orientations FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- PROJECTS
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Coordinators and admins can manage projects" ON public.projects;

CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- TECHNICAL_PRODUCTIONS
DROP POLICY IF EXISTS "Authenticated users can view technical_productions" ON public.technical_productions;
DROP POLICY IF EXISTS "Coordinators and admins can manage technical_productions" ON public.technical_productions;

CREATE POLICY "Users can view own technical_productions" ON public.technical_productions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own technical_productions" ON public.technical_productions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own technical_productions" ON public.technical_productions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own technical_productions" ON public.technical_productions FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- REVIEWER_ACTIVITIES
DROP POLICY IF EXISTS "Authenticated users can view reviewer_activities" ON public.reviewer_activities;
DROP POLICY IF EXISTS "Coordinators and admins can manage reviewer_activities" ON public.reviewer_activities;

CREATE POLICY "Users can view own reviewer_activities" ON public.reviewer_activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own reviewer_activities" ON public.reviewer_activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviewer_activities" ON public.reviewer_activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own reviewer_activities" ON public.reviewer_activities FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- RESEARCHER_METRICS
DROP POLICY IF EXISTS "Authenticated users can view metrics" ON public.researcher_metrics;
DROP POLICY IF EXISTS "Coordinators and admins can manage metrics" ON public.researcher_metrics;

CREATE POLICY "Users can view own metrics" ON public.researcher_metrics FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own metrics" ON public.researcher_metrics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metrics" ON public.researcher_metrics FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own metrics" ON public.researcher_metrics FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));

-- CITATION_ENTRIES
DROP POLICY IF EXISTS "Authenticated users can view public citations" ON public.citation_entries;
DROP POLICY IF EXISTS "Coordinators and admins can manage citation_entries" ON public.citation_entries;

CREATE POLICY "Users can view own citations" ON public.citation_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can insert own citations" ON public.citation_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own citations" ON public.citation_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Users can delete own citations" ON public.citation_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'coordinator'));
