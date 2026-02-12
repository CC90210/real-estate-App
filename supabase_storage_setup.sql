-- Create a bucket for property photos
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

-- Set up access policies for the property-photos bucket
-- 1. Allow public to read photos
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'property-photos' );

-- 2. Allow authenticated users to upload photos to their company folder
create policy "Users can upload photos"
on storage.objects for insert
with check (
    bucket_id = 'property-photos' AND
    auth.role() = 'authenticated'
);

-- 3. Allow users to delete their own company's photos
create policy "Users can delete photos"
on storage.objects for delete
using (
    bucket_id = 'property-photos' AND
    auth.role() = 'authenticated'
);
