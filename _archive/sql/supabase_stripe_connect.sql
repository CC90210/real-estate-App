-- Create table for Stripe Connect accounts
create table if not exists public.stripe_connect_accounts (
    id uuid primary key default uuid_generate_v4(),
    company_id uuid references public.companies(id) on delete cascade,
    stripe_account_id text unique not null,
    details_submitted boolean default false,
    payouts_enabled boolean default false,
    charges_enabled boolean default false,
    onboarding_complete boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.stripe_connect_accounts enable row level security;

-- Policies
create policy "Admins can view their company connect account"
on stripe_connect_accounts for select using (
    exists (
        select 1 from profiles
        where profiles.id = auth.uid()
        and profiles.company_id = stripe_connect_accounts.company_id
    )
);

-- Index
create index if not exists idx_connect_company_id on stripe_connect_accounts(company_id);
