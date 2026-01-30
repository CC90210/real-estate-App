
-- 1. Correct RLS for Areas
drop policy if exists "Admins/Agents can insert areas" on public.areas;
create policy "Admins/Agents can insert areas" on public.areas 
  for insert with check (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'agent')
    )
  );

drop policy if exists "Admins/Agents can update areas" on public.areas;
create policy "Admins/Agents can update areas" on public.areas 
  for update using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'agent')
    )
  );

-- 2. Correct RLS for Buildings
drop policy if exists "Admins/Agents can insert buildings" on public.buildings;
create policy "Admins/Agents can insert buildings" on public.buildings 
  for insert with check (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'agent')
    )
  );

drop policy if exists "Admins/Agents can update buildings" on public.buildings;
create policy "Admins/Agents can update buildings" on public.buildings 
  for update using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'agent')
    )
  );

-- 3. Correct RLS for Properties
drop policy if exists "Admins/Agents can insert properties" on public.properties;
create policy "Admins/Agents can insert properties" on public.properties 
  for insert with check (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'agent')
    )
  );

drop policy if exists "Admins/Agents can update properties" on public.properties;
create policy "Admins/Agents can update properties" on public.properties 
  for update using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'agent')
    )
  );

-- 4. Correct RLS for Applications
drop policy if exists "Anyone can insert applications" on public.applications;
create policy "Anyone can insert applications" on public.applications 
  for insert with check (true); -- Allow public applications or agent manual entry

drop policy if exists "Agents can update applications" on public.applications;
create policy "Agents can update applications" on public.applications 
  for update using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'agent')
    )
  );

-- 5. Storage Policies (Updated/Ensured)
insert into storage.buckets (id, name, public) 
values ('properties', 'properties', true)
on conflict (id) do nothing;

drop policy if exists "Allow authenticated uploads" on storage.objects;
create policy "Allow authenticated uploads" on storage.objects 
  for insert with check (
    bucket_id = 'properties' AND 
    auth.role() = 'authenticated'
  );

drop policy if exists "Allow public viewing" on storage.objects;
create policy "Allow public viewing" on storage.objects 
  for select using (bucket_id = 'properties');

drop policy if exists "Allow authenticated deletion" on storage.objects;
create policy "Allow authenticated deletion" on storage.objects 
  for delete using (
    bucket_id = 'properties' AND 
    auth.role() = 'authenticated'
  );
