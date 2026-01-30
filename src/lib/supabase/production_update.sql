
-- ADVANCED INFRASTRUCTURE ADDITIONS (v2.0)

-- 1. Enhance Applications for deeper AI Intelligence
alter table public.applications add column if not exists employer text;
alter table public.applications add column if not exists num_occupants integer default 1;
alter table public.applications add column if not exists has_pets boolean default false;
alter table public.applications add column if not exists risk_score integer; -- AI generated risk score (0-100)
alter table public.applications add column if not exists applicant_phone text;

-- 2. Documents Tracking (The Forge Infrastructure)
create table if not exists public.documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  name text not null,
  type text not null, -- 'lease', 'showing_sheet', 'summary', 'screening'
  url text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.documents enable row level security;
create policy "Users can view their own documents" on public.documents for select using (auth.uid() = user_id);
create policy "Users can insert their own documents" on public.documents for insert with check (auth.uid() = user_id);

-- 3. System Notifications
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info',
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;
create policy "Users can view their own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update their own notifications" on public.notifications for update using (auth.uid() = user_id);

-- 4. Automation: Status Change Logging Trigger
create or replace function public.log_application_status_change()
returns trigger as $$
begin
  if (old.status is distinct from new.status) then
    insert into public.activity_log (user_id, action, description)
    values (
      auth.uid(),
      'APPLICATION_STATUS_UPDATE',
      'Applicant ' || new.applicant_name || ' status changed from ' || old.status || ' to ' || new.status
    );
    
    -- Also create a notification
    insert into public.notifications (user_id, title, message, type)
    values (
      auth.uid(),
      'Status Updated: ' || new.applicant_name,
      'The application for ' || new.applicant_name || ' has been ' || new.status || '.',
      case when new.status = 'approved' then 'success' else 'info' end
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_application_status_update
  after update on public.applications
  for each row execute procedure public.log_application_status_change();

-- 5. Data Sanity: Ensure every building has a default area if not specified (optional, but good for production)
-- No changes needed here yet.
