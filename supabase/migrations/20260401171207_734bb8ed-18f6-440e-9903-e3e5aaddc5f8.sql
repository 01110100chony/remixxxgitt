
ALTER TABLE public.programs
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS website_description text,
ADD COLUMN IF NOT EXISTS website_research_lines text,
ADD COLUMN IF NOT EXISTS website_languages text,
ADD COLUMN IF NOT EXISTS has_english_version boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS internationalization_score integer DEFAULT 0;
