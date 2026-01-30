-- 1. Enable Storage Update for Properties
-- Allow authenticated users (agents) to update properties.
create policy "Agents can update properties" 
  on properties for update 
  using (auth.role() = 'authenticated'); -- or check specific role in profiles if needed

-- 2. Storage Bucket for Property Images
insert into storage.buckets (id, name, public) 
values ('properties', 'properties', true)
on conflict (id) do nothing;

-- 3. Storage Policies
-- Allow public access to view images
create policy "Public Access" 
  on storage.objects for select 
  using ( bucket_id = 'properties' );

-- Allow authenticated users to upload images
create policy "Authenticated users can upload images" 
  on storage.objects for insert 
  with check ( bucket_id = 'properties' and auth.role() = 'authenticated' );

-- Allow authenticated users to delete/update their images
create policy "Authenticated users can update images" 
  on storage.objects for update
  using ( bucket_id = 'properties' and auth.role() = 'authenticated' ); 
