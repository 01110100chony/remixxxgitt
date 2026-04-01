
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS area text,
ADD COLUMN IF NOT EXISTS modality text,
ADD COLUMN IF NOT EXISTS program_code text;
