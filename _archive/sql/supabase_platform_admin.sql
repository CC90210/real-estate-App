-- Add super admin flag to profiles
alter table public.profiles add column if not exists is_super_admin boolean default false;

-- Create platform settings table
create table if not exists public.platform_settings (
    id uuid primary key default uuid_generate_v4(),
    maintenance_mode boolean default false,
    signup_enabled boolean default true,
    global_announcement text,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Seed platform settings
insert into public.platform_settings (id) values (uuid_generate_v4())
on conflict do nothing;

-- RLS for platform settings
alter table public.platform_settings enable row level security;

create policy "Super admins can view platform settings"
on platform_settings for select using (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
);

create policy "Super admins can update platform settings"
on platform_settings for update using (
    exists (select 1 from profiles where id = auth.uid() and is_super_admin = true)
);
