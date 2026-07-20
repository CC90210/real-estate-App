-- PropFlow canonical production baseline
-- Replaces the archived repair-script chain with one deterministic, fresh-installable schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  email text,
  phone text,
  address text,
  logo_url text,
  tagline text,
  primary_color text NOT NULL DEFAULT '#2563eb',
  email_footer_text text,
  subscription_plan text NOT NULL DEFAULT 'professional',
  subscription_status text NOT NULL DEFAULT 'active',
  subscription_tier text NOT NULL DEFAULT 'tier_2',
  is_lifetime_access boolean NOT NULL DEFAULT false,
  automation_enabled boolean NOT NULL DEFAULT false,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_current_period_end timestamptz,
  stripe_connect_id text,
  stripe_connect_enabled boolean NOT NULL DEFAULT false,
  late_profile_id text,
  plan_override text,
  plan_override_reason text,
  plan_override_by uuid,
  plan_override_at timestamptz,
  property_count integer NOT NULL DEFAULT 0,
  team_member_count integer NOT NULL DEFAULT 0,
  social_account_count integer NOT NULL DEFAULT 0,
  next_invoice_number bigint NOT NULL DEFAULT 1,
  invoice_prefix text NOT NULL DEFAULT 'INV-',
  currency text NOT NULL DEFAULT 'CAD',
  subscription_started_at timestamptz,
  subscription_ends_at timestamptz,
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT 'New User',
  avatar_url text,
  phone text,
  job_title text,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'landlord', 'tenant')),
  is_super_admin boolean NOT NULL DEFAULT false,
  is_partner boolean NOT NULL DEFAULT false,
  partner_type text,
  is_active boolean NOT NULL DEFAULT true,
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_email_lower_idx ON public.profiles (lower(email));
CREATE INDEX profiles_company_id_idx ON public.profiles(company_id);

ALTER TABLE public.companies
  ADD CONSTRAINT companies_plan_override_by_fkey
  FOREIGN KEY (plan_override_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_company_id();
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active AND is_super_admin
  );
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF current_setting('propflow.trusted_profile_update', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email
     OR NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin
     OR NEW.is_partner IS DISTINCT FROM OLD.is_partner
     OR NEW.partner_type IS DISTINCT FROM OLD.partner_type
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'Protected profile fields require service-role access';
  END IF;

  IF (NEW.company_id IS DISTINCT FROM OLD.company_id
      OR NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_active IS DISTINCT FROM OLD.is_active)
     AND NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Profile membership changes require a company administrator';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_privileges_before_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

CREATE OR REPLACE FUNCTION public.protect_company_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR public.current_user_is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
     OR NEW.is_lifetime_access IS DISTINCT FROM OLD.is_lifetime_access
     OR NEW.feature_flags IS DISTINCT FROM OLD.feature_flags
     OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
     OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end
     OR NEW.plan_override IS DISTINCT FROM OLD.plan_override
     OR NEW.plan_override_reason IS DISTINCT FROM OLD.plan_override_reason
     OR NEW.plan_override_by IS DISTINCT FROM OLD.plan_override_by
     OR NEW.plan_override_at IS DISTINCT FROM OLD.plan_override_at
     OR NEW.subscription_started_at IS DISTINCT FROM OLD.subscription_started_at
     OR NEW.subscription_ends_at IS DISTINCT FROM OLD.subscription_ends_at
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'Subscription entitlements require super-admin or service-role access';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_company_entitlements_before_update
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_company_entitlements();

CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  name text NOT NULL,
  address text NOT NULL,
  city text,
  postal_code text,
  total_units integer,
  year_built integer,
  amenities text[] NOT NULL DEFAULT '{}',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.landlords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company_name text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  landlord_id uuid REFERENCES public.landlords(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  unit_number text,
  address text NOT NULL,
  city text NOT NULL DEFAULT '',
  neighborhood text,
  postal_code text,
  rent numeric(12,2) NOT NULL DEFAULT 0,
  deposit numeric(12,2) NOT NULL DEFAULT 0,
  bedrooms numeric(4,1) NOT NULL DEFAULT 0,
  bathrooms numeric(4,1) NOT NULL DEFAULT 0,
  square_feet integer,
  description text,
  amenities text[] NOT NULL DEFAULT '{}',
  lockbox_code text,
  photos text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'available',
  available_date date,
  pet_policy text,
  parking_included boolean NOT NULL DEFAULT false,
  utilities_included text[] NOT NULL DEFAULT '{}',
  video_walkthrough_url text,
  workflow_phase text NOT NULL DEFAULT 'onboarding',
  inspection_status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.property_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  caption text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  applicant_name text NOT NULL,
  applicant_email text NOT NULL,
  applicant_phone text NOT NULL DEFAULT '',
  current_address text,
  employer text,
  monthly_income numeric(12,2),
  move_in_date date,
  num_occupants integer NOT NULL DEFAULT 1,
  has_pets boolean NOT NULL DEFAULT false,
  pet_details text,
  additional_notes text,
  combined_household_income numeric(12,2),
  employment_status text,
  employment_duration text,
  previous_addresses jsonb,
  current_rent numeric(12,2),
  current_landlord_name text,
  current_landlord_phone text,
  total_debt numeric(12,2),
  num_vehicles integer,
  is_smoker boolean NOT NULL DEFAULT false,
  government_id_verified boolean,
  screening_status text NOT NULL DEFAULT 'pending',
  credit_score integer,
  background_check_passed boolean,
  criminal_check_passed boolean,
  public_records_clear boolean,
  income_verified boolean,
  screening_url text,
  screening_report_url text,
  singlekey_report_url text,
  screening_completed_at timestamptz,
  income_to_rent_ratio numeric(8,2),
  yearly_rent_cost numeric(12,2),
  dti_ratio numeric(8,2),
  status text NOT NULL DEFAULT 'new',
  denial_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  webhook_sent boolean NOT NULL DEFAULT false,
  webhook_sent_at timestamptz,
  automation_status text,
  automation_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'other',
  file_size bigint,
  document_label text,
  mime_type text,
  storage_path text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.application_screening_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  report_type text NOT NULL DEFAULT 'singlekey',
  extracted_credit_score integer,
  extracted_income numeric(12,2),
  extracted_criminal_clear boolean,
  extracted_public_records_clear boolean,
  extracted_bankruptcies integer,
  extracted_collections integer,
  extracted_legal_cases integer,
  extracted_summary text,
  extracted_risk_flags jsonb,
  raw_extracted_data jsonb,
  processing_status text NOT NULL DEFAULT 'pending',
  processed_at timestamptz,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  description text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_url text,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  related_property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  related_landlord_id uuid REFERENCES public.landlords(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'completed',
  currency text NOT NULL DEFAULT 'CAD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  recipient_name text NOT NULL,
  recipient_email text,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  pdf_url text,
  pdf_generated_at timestamptz,
  currency text NOT NULL DEFAULT 'CAD',
  paid_at timestamptz,
  paid_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, invoice_number)
);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text,
  reference text,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  rate numeric(12,2) NOT NULL DEFAULT 0,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.showings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id uuid REFERENCES public.landlords(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  prospect_name text,
  prospect_email text,
  prospect_phone text,
  scheduled_date date NOT NULL,
  scheduled_time time,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_name text NOT NULL,
  tenant_email text NOT NULL,
  tenant_phone text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  rent_amount numeric(12,2) NOT NULL,
  deposit_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_day integer NOT NULL DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 28),
  status text NOT NULL DEFAULT 'draft',
  auto_renew boolean NOT NULL DEFAULT false,
  renewal_notice_days integer NOT NULL DEFAULT 60,
  rent_escalation_pct numeric(6,2) NOT NULL DEFAULT 0,
  lease_document_url text,
  signed_at timestamptz,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  photos text[] NOT NULL DEFAULT '{}',
  estimated_cost numeric(12,2),
  actual_cost numeric(12,2),
  scheduled_date date,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'system',
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  action_url text,
  action_label text,
  email_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  type text NOT NULL DEFAULT 'prospect',
  company_name text,
  address text,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  last_contacted_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'lease_signing',
  amount numeric(12,2) NOT NULL,
  percentage numeric(7,3),
  status text NOT NULL DEFAULT 'pending',
  description text,
  earned_date date NOT NULL DEFAULT current_date,
  paid_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  template_id uuid,
  inspected_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  inspected_by_name text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  notes text,
  signed_at timestamptz,
  landlord_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'not_checked',
  notes text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  maintenance_request_id uuid REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  landlord_override boolean NOT NULL DEFAULT false,
  landlord_override_at timestamptz,
  landlord_override_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'agent', 'landlord', 'tenant')),
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

CREATE TABLE public.platform_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  label text NOT NULL,
  company_name text,
  assigned_plan text NOT NULL DEFAULT 'agent_pro',
  is_enterprise boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'revoked', 'expired')),
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  use_count integer NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  company_created_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT false,
  tier text NOT NULL DEFAULT 'none',
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_endpoints jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  email_provider text,
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password text,
  from_name text,
  from_email text,
  singlekey_api_key text,
  document_email_enabled boolean NOT NULL DEFAULT false,
  document_email_recipients text[] NOT NULL DEFAULT ARRAY['landlord'],
  document_email_template text,
  invoice_email_enabled boolean NOT NULL DEFAULT false,
  invoice_email_recipients text[] NOT NULL DEFAULT ARRAY['tenant'],
  invoice_email_template text,
  webhook_url text,
  webhook_secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  webhook_events text[] NOT NULL DEFAULT ARRAY['document.created', 'invoice.created'],
  platform_credentials jsonb,
  listing_platforms text[] NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error_message text,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'inactive',
  purchased_at timestamptz,
  implementation_fee_paid boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_executions integer NOT NULL DEFAULT 0,
  successful_executions integer NOT NULL DEFAULT 0,
  last_execution_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, type)
);

CREATE TABLE public.automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automation_configs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  error_message text,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  error_message text,
  response_code integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.incoming_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  payload_hash text,
  processed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, event_id)
);

CREATE TABLE public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope, window_start)
);

CREATE TABLE public.gmail_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_expiry timestamptz,
  scopes text[] NOT NULL DEFAULT '{}',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

CREATE TABLE public.tenant_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  tenant_name text NOT NULL,
  tenant_email text,
  amount numeric(12,2) NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  paid_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stripe_connect_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  onboarding_complete boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.landlord_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.landlords(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(landlord_id, property_id)
);

CREATE TABLE public.agent_social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  late_profile_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  late_account_id text NOT NULL,
  platform text NOT NULL,
  account_name text NOT NULL DEFAULT '',
  account_avatar text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, late_account_id)
);

CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  late_post_id text,
  content text NOT NULL DEFAULT '',
  media_urls text[] NOT NULL DEFAULT '{}',
  hashtags text[] NOT NULL DEFAULT '{}',
  platforms text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.signing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  recipient_email text NOT NULL,
  recipient_name text,
  message text,
  document_url text,
  signing_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  signed_at timestamptz,
  signature_data jsonb,
  signed_document_url text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.signing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signing_request_id uuid NOT NULL REFERENCES public.signing_requests(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_email text,
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.walkthrough_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  photo_count integer NOT NULL DEFAULT 0 CHECK (photo_count BETWEEN 0 AND 500),
  runpod_job_id text,
  error_message text,
  progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  share_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  splat_r2_key text,
  preview_r2_key text,
  splat_size_bytes bigint,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for company filters and common workflow lookups.
CREATE INDEX areas_company_idx ON public.areas(company_id);
CREATE INDEX buildings_company_idx ON public.buildings(company_id);
CREATE INDEX properties_company_idx ON public.properties(company_id);
CREATE INDEX properties_status_idx ON public.properties(company_id, status);
CREATE INDEX applications_company_idx ON public.applications(company_id);
CREATE INDEX applications_status_idx ON public.applications(company_id, status);
CREATE INDEX activity_log_company_created_idx ON public.activity_log(company_id, created_at DESC);
CREATE INDEX documents_company_idx ON public.documents(company_id);
CREATE INDEX invoices_company_idx ON public.invoices(company_id);
CREATE INDEX showings_company_date_idx ON public.showings(company_id, scheduled_date);
CREATE INDEX maintenance_company_status_idx ON public.maintenance_requests(company_id, status);
CREATE INDEX notifications_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX automation_logs_company_idx ON public.automation_logs(company_id, triggered_at DESC);
CREATE INDEX webhook_events_pending_idx ON public.webhook_events(status, created_at) WHERE status IN ('pending', 'retrying');
CREATE INDEX api_rate_limits_expires_idx ON public.api_rate_limits(expires_at);
CREATE INDEX incoming_webhook_events_expires_idx ON public.incoming_webhook_events(expires_at);
CREATE INDEX signing_requests_company_idx ON public.signing_requests(company_id);
CREATE INDEX walkthrough_jobs_company_idx ON public.walkthrough_jobs(company_id);

-- Every public table is protected by RLS. Service-role server routes retain administrative access.
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_screening_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoming_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walkthrough_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_member_access ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.get_user_company_id() OR public.current_user_is_super_admin());
CREATE POLICY companies_admin_update ON public.companies
  FOR UPDATE TO authenticated
  USING (
    public.current_user_is_super_admin()
    OR (id = public.get_user_company_id() AND public.current_user_is_admin())
  )
  WITH CHECK (
    public.current_user_is_super_admin()
    OR (id = public.get_user_company_id() AND public.current_user_is_admin())
  );

CREATE POLICY profiles_company_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_super_admin()
    OR id = auth.uid()
    OR company_id = public.get_user_company_id()
  );
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.current_user_is_super_admin()
    OR (company_id = public.get_user_company_id() AND public.current_user_is_admin())
  )
  WITH CHECK (
    public.current_user_is_super_admin()
    OR company_id = public.get_user_company_id()
  );

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'areas', 'buildings', 'landlords', 'properties', 'applications',
    'application_documents', 'application_screening_reports', 'activity_log',
    'documents', 'invoices', 'showings', 'leases', 'maintenance_requests',
    'contacts', 'commissions', 'inspections', 'team_invitations',
    'automation_subscriptions', 'automation_settings', 'automation_logs',
    'automation_configs', 'webhook_events', 'gmail_oauth_tokens',
    'tenant_payments', 'stripe_connect_accounts', 'social_accounts',
    'social_posts', 'signing_requests', 'walkthrough_jobs'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (company_id = public.get_user_company_id()) WITH CHECK (company_id = public.get_user_company_id())',
      table_name || '_company_access', table_name
    );
  END LOOP;
END;
$$;

CREATE POLICY property_photos_company_access ON public.property_photos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.company_id = public.get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.company_id = public.get_user_company_id()));

CREATE POLICY invoice_items_company_access ON public.invoice_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.company_id = public.get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.company_id = public.get_user_company_id()));

CREATE POLICY inspection_items_company_access ON public.inspection_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND i.company_id = public.get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND i.company_id = public.get_user_company_id()));

CREATE POLICY automation_executions_company_access ON public.automation_executions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.automation_configs c WHERE c.id = automation_id AND c.company_id = public.get_user_company_id()));

CREATE POLICY notifications_owner_access ON public.notifications
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() AND public.current_user_is_admin());
CREATE POLICY audit_logs_member_insert ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id() AND user_id = auth.uid());

CREATE POLICY platform_invitations_super_admin_access ON public.platform_invitations
  FOR ALL TO authenticated
  USING (public.current_user_is_super_admin())
  WITH CHECK (public.current_user_is_super_admin());

CREATE POLICY landlord_properties_company_access ON public.landlord_properties
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.company_id = public.get_user_company_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.company_id = public.get_user_company_id()));

CREATE POLICY agent_social_profiles_owner_access ON public.agent_social_profiles
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY signing_audit_log_company_select ON public.signing_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.signing_requests r WHERE r.id = signing_request_id AND r.company_id = public.get_user_company_id()));

REVOKE ALL ON public.api_rate_limits, public.incoming_webhook_events FROM anon, authenticated;
REVOKE ALL ON public.platform_invitations FROM anon;

-- Auth onboarding and recovery-safe profile provisioning.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record public.team_invitations%ROWTYPE;
  new_company_id uuid;
  company_name text;
  display_name text;
BEGIN
  IF NEW.raw_user_meta_data->>'skip_profile_provisioning' = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO invite_record
  FROM public.team_invitations
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  display_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1));

  IF invite_record.id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
    VALUES (NEW.id, lower(NEW.email), display_name, NEW.raw_user_meta_data->>'job_title', invite_record.role, invite_record.company_id)
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.team_invitations
    SET status = 'accepted', accepted_at = now(), accepted_by = NEW.id, updated_at = now()
    WHERE id = invite_record.id;
  ELSE
    company_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name', ''), 'My Company');
    INSERT INTO public.companies (name, slug, email)
    VALUES (
      company_name,
      trim(both '-' from regexp_replace(lower(company_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8),
      lower(NEW.email)
    )
    RETURNING id INTO new_company_id;

    INSERT INTO public.profiles (id, email, full_name, job_title, role, company_id)
    VALUES (NEW.id, lower(NEW.email), display_name, NEW.raw_user_meta_data->>'job_title', 'admin', new_company_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.automation_subscriptions (company_id, is_active, tier, features)
    VALUES (new_company_id, true, 'professional', '{"document_sender": true}'::jsonb)
    ON CONFLICT (company_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user auth.users%ROWTYPE;
  new_company_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Not authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    RETURN jsonb_build_object('status', 'success', 'message', 'Profile already exists');
  END IF;

  SELECT * INTO current_user FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.companies (name, email)
  VALUES (COALESCE(NULLIF(current_user.raw_user_meta_data->>'company_name', ''), 'My Company'), lower(current_user.email))
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, company_id, email, full_name, job_title, role)
  VALUES (
    current_user.id,
    new_company_id,
    lower(current_user.email),
    COALESCE(NULLIF(current_user.raw_user_meta_data->>'full_name', ''), split_part(current_user.email, '@', 1)),
    current_user.raw_user_meta_data->>'job_title',
    'admin'
  );

  INSERT INTO public.automation_subscriptions (company_id, is_active, tier)
  VALUES (new_company_id, true, 'professional');

  RETURN jsonb_build_object('status', 'success', 'message', 'Profile created');
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_profile_admin(
  u_id uuid,
  u_email text,
  f_name text,
  c_name text,
  j_title text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = u_id) THEN
    RETURN jsonb_build_object('status', 'success', 'message', 'Profile already exists');
  END IF;

  INSERT INTO public.companies (name, email)
  VALUES (COALESCE(NULLIF(c_name, ''), 'My Company'), lower(u_email))
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, company_id, email, full_name, job_title, role)
  VALUES (u_id, new_company_id, lower(u_email), COALESCE(NULLIF(f_name, ''), 'New User'), j_title, 'admin');

  INSERT INTO public.automation_subscriptions (company_id, is_active, tier)
  VALUES (new_company_id, true, 'professional');

  RETURN jsonb_build_object('status', 'success', 'message', 'Profile created');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status', 'error', 'message', 'Profile initialization failed');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(token_input text)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  company_id uuid,
  company_name text,
  company_logo_url text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ti.id, ti.email, ti.role, ti.company_id, c.name, c.logo_url, ti.status
  FROM public.team_invitations ti
  JOIN public.companies c ON c.id = ti.company_id
  WHERE ti.token = token_input AND ti.status = 'pending' AND ti.expires_at > now()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation_manually(token_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record public.team_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;

  SELECT * INTO invite_record FROM public.team_invitations
  WHERE token = token_input AND status = 'pending' AND expires_at > now()
  LIMIT 1;

  IF invite_record.id IS NULL OR lower(invite_record.email) <> lower(auth.email()) THEN
    RETURN false;
  END IF;

  PERFORM set_config('propflow.trusted_profile_update', 'on', true);
  UPDATE public.profiles
  SET company_id = invite_record.company_id, role = invite_record.role, updated_at = now()
  WHERE id = auth.uid();
  PERFORM set_config('propflow.trusted_profile_update', 'off', true);

  UPDATE public.team_invitations
  SET status = 'accepted', accepted_at = now(), accepted_by = auth.uid(), updated_at = now()
  WHERE id = invite_record.id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number bigint;
  prefix text;
BEGIN
  IF p_company_id <> public.get_user_company_id()
     AND current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.companies
  SET next_invoice_number = next_invoice_number + 1
  WHERE id = p_company_id
  RETURNING next_invoice_number - 1, invoice_prefix INTO next_number, prefix;

  IF next_number IS NULL THEN RAISE EXCEPTION 'Company not found'; END IF;
  RETURN prefix || lpad(next_number::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_enhanced_dashboard_stats(
  p_company_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_is_landlord boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'totalProperties', (SELECT count(*) FROM public.properties p WHERE p.company_id = p_company_id AND (NOT p_is_landlord OR p.owner_id = p_user_id)),
    'availableProperties', (SELECT count(*) FROM public.properties p WHERE p.company_id = p_company_id AND p.status = 'available' AND (NOT p_is_landlord OR p.owner_id = p_user_id)),
    'rentedProperties', (SELECT count(*) FROM public.properties p WHERE p.company_id = p_company_id AND p.status = 'rented' AND (NOT p_is_landlord OR p.owner_id = p_user_id)),
    'totalApplications', (SELECT count(*) FROM public.applications a WHERE a.company_id = p_company_id),
    'pendingApplications', (SELECT count(*) FROM public.applications a WHERE a.company_id = p_company_id AND a.status IN ('new', 'pending', 'submitted', 'screening')),
    'totalMonthlyRevenue', (SELECT COALESCE(sum(i.total), 0) FROM public.invoices i WHERE i.company_id = p_company_id AND i.status = 'paid' AND COALESCE(i.paid_at, i.updated_at) >= date_trunc('month', now())),
    'totalLifetimeRevenue', (SELECT COALESCE(sum(i.total), 0) FROM public.invoices i WHERE i.company_id = p_company_id AND i.status = 'paid'),
    'totalMonthlyRent', (SELECT COALESCE(sum(l.rent_amount), 0) FROM public.leases l WHERE l.company_id = p_company_id AND lower(l.status) = 'active'),
    'teamMembers', (SELECT count(*) FROM public.profiles p WHERE p.company_id = p_company_id AND p.is_active),
    'totalAreas', (SELECT count(*) FROM public.areas a WHERE a.company_id = p_company_id),
    'totalBuildings', (SELECT count(*) FROM public.buildings b WHERE b.company_id = p_company_id),
    'openMaintenance', (SELECT count(*) FROM public.maintenance_requests m WHERE m.company_id = p_company_id AND m.status NOT IN ('completed', 'cancelled')),
    'upcomingShowings', (SELECT count(*) FROM public.showings s WHERE s.company_id = p_company_id AND s.scheduled_date >= current_date),
    'occupancyRate', (SELECT CASE WHEN count(*) = 0 THEN 0 ELSE round(100.0 * count(*) FILTER (WHERE p.status = 'rented') / count(*)) END FROM public.properties p WHERE p.company_id = p_company_id),
    'recentActivity', COALESCE((SELECT jsonb_agg(row_to_json(recent)) FROM (SELECT a.id, a.action, a.entity_type, a.details, a.created_at FROM public.activity_log a WHERE a.company_id = p_company_id ORDER BY a.created_at DESC LIMIT 20) recent), '[]'::jsonb)
  )
  WHERE p_company_id = public.get_user_company_id()
     OR current_setting('request.jwt.claim.role', true) = 'service_role';
$$;

CREATE OR REPLACE FUNCTION public.increment_automation_counter(config_id uuid, is_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.automation_configs
  SET total_executions = total_executions + 1,
      successful_executions = successful_executions + CASE WHEN is_success THEN 1 ELSE 0 END,
      last_execution_at = now(),
      updated_at = now()
  WHERE id = config_id
    AND (company_id = public.get_user_company_id() OR current_setting('request.jwt.claim.role', true) = 'service_role');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.current_user_is_super_admin() THEN jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_companies', (SELECT count(*) FROM public.companies),
    'total_properties', (SELECT count(*) FROM public.properties),
    'total_applications', (SELECT count(*) FROM public.applications)
  ) ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_scope text,
  p_limit integer,
  p_window_seconds integer DEFAULT 60
)
RETURNS TABLE (allowed boolean, current_count integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_time timestamptz := now();
  seconds integer := greatest(COALESCE(p_window_seconds, 60), 1);
  bucket_start timestamptz;
BEGIN
  IF p_scope IS NULL OR btrim(p_scope) = '' OR p_limit < 1 THEN
    RAISE EXCEPTION 'Invalid rate-limit parameters';
  END IF;

  DELETE FROM public.api_rate_limits WHERE expires_at < current_time;
  bucket_start := to_timestamp(floor(extract(epoch FROM current_time) / seconds) * seconds);

  INSERT INTO public.api_rate_limits (scope, window_start, count, expires_at)
  VALUES (p_scope, bucket_start, 1, bucket_start + make_interval(secs => seconds * 2))
  ON CONFLICT (scope, window_start) DO UPDATE
  SET count = public.api_rate_limits.count + 1, updated_at = current_time
  RETURNING count INTO current_count;

  allowed := current_count <= p_limit;
  reset_at := bucket_start + make_interval(secs => seconds);
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_incoming_webhook_event(
  p_provider text,
  p_event_id text,
  p_payload_hash text DEFAULT NULL,
  p_ttl_seconds integer DEFAULT 86400
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF p_provider IS NULL OR btrim(p_provider) = '' OR p_event_id IS NULL OR btrim(p_event_id) = '' THEN
    RAISE EXCEPTION 'Invalid webhook identity';
  END IF;

  DELETE FROM public.incoming_webhook_events WHERE expires_at < now();
  INSERT INTO public.incoming_webhook_events (provider, event_id, payload_hash, expires_at)
  VALUES (p_provider, p_event_id, p_payload_hash, now() + make_interval(secs => greatest(COALESCE(p_ttl_seconds, 86400), 60)))
  ON CONFLICT (provider, event_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.reap_stale_walkthrough_jobs()
RETURNS TABLE(job_id uuid, prev_status text, age_minutes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stale AS (
    SELECT id, status, extract(epoch FROM (now() - COALESCE(started_at, created_at)))::integer / 60 AS age
    FROM public.walkthrough_jobs
    WHERE status IN ('uploading', 'queued', 'training')
      AND COALESCE(started_at, created_at) < now() - interval '1 hour'
    FOR UPDATE
  ), updated AS (
    UPDATE public.walkthrough_jobs j
    SET status = 'failed', error_message = COALESCE(j.error_message, 'Walkthrough job timed out'), completed_at = now(), updated_at = now()
    FROM stale s WHERE j.id = s.id
    RETURNING j.id, s.status, s.age
  )
  SELECT * FROM updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_active_walkthroughs(p_company_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.walkthrough_jobs
  WHERE company_id = p_company_id AND status IN ('uploading', 'queued', 'training');
$$;

-- updated_at is automatic across mutable tables.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'companies', 'profiles', 'areas', 'buildings', 'landlords', 'properties',
    'property_photos', 'applications', 'application_documents',
    'application_screening_reports', 'activity_log', 'audit_logs', 'documents',
    'invoices', 'invoice_items', 'showings', 'leases', 'maintenance_requests',
    'notifications', 'contacts', 'commissions', 'inspections', 'inspection_items',
    'team_invitations', 'platform_invitations', 'automation_subscriptions',
    'automation_settings', 'automation_logs', 'automation_configs',
    'automation_executions', 'webhook_events', 'incoming_webhook_events',
    'api_rate_limits', 'gmail_oauth_tokens', 'tenant_payments',
    'stripe_connect_accounts', 'landlord_properties', 'agent_social_profiles',
    'social_accounts', 'social_posts', 'signing_requests', 'signing_audit_log',
    'walkthrough_jobs'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      'set_' || table_name || '_updated_at', table_name
    );
  END LOOP;
END;
$$;

-- Storage buckets. Public read is intentional for listing media; writes remain authenticated.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('documents', 'documents', true, 52428800),
  ('logos', 'logos', true, 5242880),
  ('media', 'media', true, 52428800),
  ('properties', 'properties', true, 52428800),
  ('property-photos', 'property-photos', true, 52428800),
  ('application-documents', 'application-documents', true, 262144000),
  ('application-screening-reports', 'application-screening-reports', true, 262144000)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

CREATE POLICY propflow_storage_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('documents', 'logos', 'media', 'properties', 'property-photos', 'application-documents', 'application-screening-reports'));
CREATE POLICY propflow_storage_authenticated_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('documents', 'logos', 'media', 'properties', 'property-photos', 'application-documents', 'application-screening-reports'));
CREATE POLICY propflow_storage_owner_update ON storage.objects
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY propflow_storage_owner_delete ON storage.objects
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Remove that
-- implicit surface first, then expose only the RPCs each application role needs.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_company() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_admin(uuid, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation_manually(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_enhanced_dashboard_stats(uuid, uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_automation_counter(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_incoming_webhook_event(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reap_stale_walkthrough_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION public.count_active_walkthroughs(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
