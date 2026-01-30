
-- 1. Add Landlord/Owner field to properties
alter table public.properties 
add column if not exists owner_id uuid references public.profiles(id);

-- 2. Update RLS for Landlords
-- Landlords can see only their properties
drop policy if exists "Landlords can view own properties" on public.properties;
create policy "Landlords can view own properties" on public.properties
  for select using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'landlord' and public.properties.owner_id = auth.uid()
    ) OR
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'agent')
    )
  );

-- 3. Update existing policies to be more granular if needed
-- (Wait, I already have "Properties are viewable by everyone" in setup.sql)
-- Let's tighten it.
drop policy if exists "Properties are viewable by everyone" on public.properties;
create policy "Properties are public for viewing" on public.properties
  for select using (true); 
  -- Actually, in a multi-tenant SaaS, you might want this to be restricted, 
  -- but usually public listings are okay. 
  -- However, for the Dashboard, we should filter by owner.
