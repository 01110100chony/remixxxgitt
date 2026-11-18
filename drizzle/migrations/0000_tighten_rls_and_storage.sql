CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_manage_program(_user_id uuid, _program_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'coordinator')
    OR EXISTS (SELECT 1 FROM public.programs p WHERE p.id::text = _program_id AND (p.user_id = _user_id OR p.created_by = _user_id))
$$;

DROP POLICY "Authenticated users can view evaluation_weights" ON public.evaluation_weights;
CREATE POLICY "Users with a role can view evaluation_weights" ON public.evaluation_weights FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

DROP POLICY "Authenticated users can view qualis" ON public.qualis_reference;
CREATE POLICY "Users with a role can view qualis" ON public.qualis_reference FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

DROP POLICY "Authenticated users can view journal_metrics" ON public.journal_metrics;
CREATE POLICY "Users with a role can view journal_metrics" ON public.journal_metrics FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

DROP POLICY "Authenticated users can view all programs" ON public.programs;
CREATE POLICY "Users with a role can view programs" ON public.programs FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

DROP POLICY "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or staff" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordinator'));

DROP POLICY "Authenticated users can view planning data" ON public.planning_data;
CREATE POLICY "Program managers can view planning data" ON public.planning_data FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.can_manage_program(auth.uid(), program_id::text));

DROP POLICY "Authenticated can view processing history" ON public.lattes_processing_history;

DROP POLICY "Authenticated can read lattes-xml" ON storage.objects;
DROP POLICY "Authenticated can upload lattes-xml" ON storage.objects;
DROP POLICY "Authenticated can update lattes-xml" ON storage.objects;
DROP POLICY "Authenticated can delete lattes-xml" ON storage.objects;
DROP POLICY "Authenticated users can upload logos" ON storage.objects;
DROP POLICY "Authenticated users can update logos" ON storage.objects;
DROP POLICY "Authenticated users can delete logos" ON storage.objects;

CREATE POLICY "Program managers read lattes-xml" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lattes-xml' AND (owner_id = (select auth.uid()::text) OR public.can_manage_program(auth.uid(), (storage.foldername(name))[1])));
CREATE POLICY "Program managers upload lattes-xml" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lattes-xml' AND public.can_manage_program(auth.uid(), (storage.foldername(name))[1]));
CREATE POLICY "Program managers update lattes-xml" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lattes-xml' AND public.can_manage_program(auth.uid(), (storage.foldername(name))[1]));
CREATE POLICY "Program managers delete lattes-xml" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lattes-xml' AND public.can_manage_program(auth.uid(), (storage.foldername(name))[1]));

CREATE POLICY "Program managers upload logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'program-logos' AND public.can_manage_program(auth.uid(), (storage.foldername(name))[1]));
CREATE POLICY "Program managers update logos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'program-logos' AND public.can_manage_program(auth.uid(), (storage.foldername(name))[1]));
CREATE POLICY "Program managers delete logos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'program-logos' AND public.can_manage_program(auth.uid(), (storage.foldername(name))[1]));