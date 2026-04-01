
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'coordinator', 'researcher', 'viewer');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Programs
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view programs" ON public.programs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordinators and admins can manage programs" ON public.programs
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')
  );

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  program_id UUID REFERENCES public.programs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Researchers
CREATE TABLE public.researchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  gender TEXT DEFAULT 'Não informado',
  research_line TEXT,
  orcid TEXT,
  lattes_xml_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.researchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view researchers" ON public.researchers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordinators and admins can manage researchers" ON public.researchers
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')
  );

-- Articles
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID REFERENCES public.researchers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  year INTEGER,
  journal TEXT,
  issn TEXT,
  doi TEXT,
  citations INTEGER DEFAULT 0,
  qualis TEXT,
  authors TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view articles" ON public.articles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordinators and admins can manage articles" ON public.articles
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')
  );

-- Orientations
CREATE TABLE public.orientations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID REFERENCES public.researchers(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'concluded',
  title TEXT,
  student TEXT,
  year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orientations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view orientations" ON public.orientations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordinators and admins can manage orientations" ON public.orientations
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')
  );

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID REFERENCES public.researchers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  year_start INTEGER,
  year_end INTEGER,
  funding TEXT DEFAULT 'Não',
  partner_institution TEXT,
  funder TEXT,
  type TEXT DEFAULT 'research',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordinators and admins can manage projects" ON public.projects
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')
  );

-- Technical Productions
CREATE TABLE public.technical_productions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID REFERENCES public.researchers(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.technical_productions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view technical_productions" ON public.technical_productions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordinators and admins can manage technical_productions" ON public.technical_productions
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')
  );

-- Reviewer Activities
CREATE TABLE public.reviewer_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID REFERENCES public.researchers(id) ON DELETE CASCADE NOT NULL,
  journal_event TEXT NOT NULL,
  type TEXT,
  year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviewer_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view reviewer_activities" ON public.reviewer_activities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordinators and admins can manage reviewer_activities" ON public.reviewer_activities
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')
  );

-- Qualis Reference Table
CREATE TABLE public.qualis_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issn TEXT NOT NULL,
  classification TEXT NOT NULL,
  area TEXT,
  UNIQUE(issn, area)
);
ALTER TABLE public.qualis_reference ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view qualis" ON public.qualis_reference
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage qualis" ON public.qualis_reference
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));

-- Researcher Metrics (manual or auto)
CREATE TABLE public.researcher_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID REFERENCES public.researchers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_citations INTEGER DEFAULT 0,
  h_index INTEGER DEFAULT 0,
  i10_index INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.researcher_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view metrics" ON public.researcher_metrics
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coordinators and admins can manage metrics" ON public.researcher_metrics
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator')
  );

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_researchers_updated_at BEFORE UPDATE ON public.researchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_researcher_metrics_updated_at BEFORE UPDATE ON public.researcher_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
