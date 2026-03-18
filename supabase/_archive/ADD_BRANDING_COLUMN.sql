-- ==============================================================================
-- ADD BRANDING COLUMN TO PROFILES
-- This allows saving workspace accent colors and theme preferences
-- ==============================================================================

-- Add branding column (JSONB to store accent, theme, etc.)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{"accent": "blue", "theme": "light"}'::jsonb;

-- Ensure the column exists with proper defaults
UPDATE public.profiles 
SET branding = '{"accent": "blue", "theme": "light"}'::jsonb 
WHERE branding IS NULL;

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Branding column added successfully!' AS status;
