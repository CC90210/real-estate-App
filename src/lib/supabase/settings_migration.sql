
-- 1. Add preferences and branding columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{"notifications": {"email": true, "push": true, "webhook_new_app": true, "webhook_ai_doc": true, "webhook_revenue": false}}'::jsonb,
ADD COLUMN IF NOT EXISTS branding jsonb DEFAULT '{"accent": "blue", "theme": "light"}'::jsonb;

-- 2. Ensure RLS policies allow users to update their own profiles (if not already set)
-- (This is usually standard, but good to double check or reaffirm)
create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id );
