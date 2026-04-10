-- Add logo_url column to programs
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS logo_url text;

-- Create storage bucket for program logos
INSERT INTO storage.buckets (id, name, public) VALUES ('program-logos', 'program-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'program-logos');

-- Allow public read access to logos
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'program-logos');

-- Allow authenticated users to update/delete their logos
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'program-logos');

CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'program-logos');