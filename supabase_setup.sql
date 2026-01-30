
-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. PROFILES & AUTH SETUP
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  role text check (role in ('admin', 'agent', 'landlord', 'tenant')) default 'agent',
  avatar_url text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone" 
  on profiles for select using (true);

create policy "Users can insert their own profile" 
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile" 
  on profiles for update using (auth.uid() = id);

-- Trigger to handle new user signup automatically (Robustness)
-- This ensures that even if the frontend fails to insert, the DB does it.
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'agent')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. AREAS
create table if not exists public.areas (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.areas enable row level security;
create policy "Areas are viewable by everyone" on areas for select using (true);


-- 3. BUILDINGS
create table if not exists public.buildings (
  id uuid default uuid_generate_v4() primary key,
  area_id uuid references public.areas(id) not null,
  name text not null,
  address text not null,
  amenities text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.buildings enable row level security;
create policy "Buildings are viewable by everyone" on buildings for select using (true);


-- 4. PROPERTIES
create table if not exists public.properties (
  id uuid default uuid_generate_v4() primary key,
  building_id uuid references public.buildings(id) not null,
  unit_number text not null,
  address text not null, -- denormalized for search ease
  description text,
  rent numeric not null,
  deposit numeric,
  bedrooms integer default 1,
  bathrooms numeric default 1,
  square_feet integer,
  status text check (status in ('available', 'rented', 'pending', 'maintenance')) default 'available',
  available_date date default CURRENT_DATE,
  lockbox_code text, -- secure field
  photos text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  amenities text[] default '{}'
);
alter table public.properties enable row level security;
create policy "Properties are viewable by everyone" on properties for select using (true);


-- 5. APPLICATIONS
create table if not exists public.applications (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) not null,
  applicant_name text not null,
  applicant_email text not null,
  status text check (status in ('pending', 'approved', 'denied', 'screening')) default 'pending',
  monthly_income numeric,
  credit_score integer,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.applications enable row level security;
create policy "Agents can view all applications" on applications for select using (true);


-- 6. ACTIVITY LOG
create table if not exists public.activity_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  action text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.activity_log enable row level security;
create policy "Activity log viewable by everyone" on activity_log for select using (true);


-- SEED DATA (Only runs if tables are empty)
do $$
declare
  v_area_id uuid;
  v_building_id uuid;
begin
  if not exists (select 1 from public.areas limit 1) then
     insert into public.areas (name, description) 
     values ('Downtown Core', 'The heart of the city, bustling with activity.')
     returning id into v_area_id;

     insert into public.buildings (area_id, name, address, amenities)
     values (v_area_id, 'The Pinnacle', '100 Main St', ARRAY['Gym', 'Concierge'])
     returning id into v_building_id;

     insert into public.properties (building_id, unit_number, address, rent, bedrooms, bathrooms, status, lockbox_code)
     values 
       (v_building_id, '101', '100 Main St, Unit 101', 2500, 2, 2, 'available', '1234'),
       (v_building_id, '205', '100 Main St, Unit 205', 1800, 1, 1, 'rented', '5678');
  end if;
end $$;

