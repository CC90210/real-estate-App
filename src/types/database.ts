// PropFlow Database Types

export type UserRole = 'admin' | 'agent' | 'landlord' | 'tenant';

export type PropertyStatus = 'available' | 'pending' | 'rented' | 'maintenance';

export type ApplicationStatus = 'new' | 'screening' | 'approved' | 'denied' | 'withdrawn';

export type ScreeningStatus = 'pending' | 'submitted' | 'completed' | 'rejected';

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  subscription_plan?: 'essentials' | 'professional' | 'enterprise' | null;
  subscription_status?: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'inactive' | null;
  subscription_tier?: string | null;
  is_lifetime_access?: boolean;
  automation_enabled?: boolean;
  feature_flags?: Record<string, boolean>;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
  trial_ends_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_super_admin: boolean;
  is_partner?: boolean;
  partner_type?: 'referral' | 'agency' | 'enterprise';
  company_id: string | null;
  phone: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Area {
  id: string;
  name: string;
  description: string | null;
  company_id: string | null;
  created_at: string;
  // Computed fields
  building_count?: number;
  available_properties_count?: number;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  area_id: string;
  company_id: string | null;
  total_units: number | null;
  year_built: number | null;
  amenities: string[] | null;
  created_at: string;
  // Relations
  area?: Area;
  // Computed fields
  available_units_count?: number;
}



export interface PropertyPhoto {
  id: string;
  property_id: string;
  url: string;
  is_primary: boolean;
  caption: string | null;
  order_index: number;
  created_at: string;
}

export interface Application {
  id: string;
  property_id: string;
  agent_id: string | null;
  company_id: string | null;

  // Applicant Info
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  current_address: string | null;
  employer: string | null;
  monthly_income: number | null;
  move_in_date: string | null;
  num_occupants: number;
  has_pets: boolean;
  pet_details: string | null;
  additional_notes: string | null;

  // Screening Results (SENSITIVE: Only visible to landlords/admins)
  screening_status: ScreeningStatus;
  credit_score: number | null;
  background_check_passed: boolean | null;
  income_verified: boolean | null;
  screening_report_url: string | null;
  screening_completed_at: string | null;

  // Workflow
  status: ApplicationStatus;
  webhook_sent: boolean;
  webhook_sent_at: string | null;

  created_at: string;
  updated_at: string;

  // Relations
  property?: Property;
  agent?: Profile;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Relations
  user?: Profile;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Form Types
export interface ApplicationFormData {
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  current_address?: string;
  employer?: string;
  monthly_income?: number;
  move_in_date?: string;
  num_occupants: number;
  has_pets: boolean;
  pet_details?: string;
  additional_notes?: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Ad Generation Types
export type AdFormat = 'social' | 'listing' | 'email';

export interface Landlord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  // Computed
  properties_count?: number;
}

export interface Document {
  id: string;
  type: 'property_summary' | 'lease_proposal' | 'showing_sheet' | 'landlord_report';
  related_property_id: string | null;
  related_landlord_id: string | null;
  content: any; // JSONB
  created_by: string | null;
  created_at: string;
  // Relations
  property?: Property;
  landlord?: Landlord;
}

// Updated Property interface to match new spec while keeping compatibility if needed
export interface Property {
  id: string;
  landlord_id: string | null;
  building_id?: string;
  company_id?: string | null;
  unit_number: string | null;
  address: string;
  city: string;
  neighborhood: string | null;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number | null;
  description: string | null;
  amenities: string[] | null;
  lockbox_code: string | null;
  status: PropertyStatus;
  available_date: string | null;
  created_at: string;
  updated_at?: string;
  photos: string[] | null;

  // Fields from old interface to prevent breaking changes
  pet_policy?: string | null;
  parking_included?: boolean;
  utilities_included?: string[] | null;

  // Relations
  landlord?: Landlord;
  building?: Building;
  photos_relation?: PropertyPhoto[];
}

export type DocumentType = 'property_summary' | 'lease_proposal' | 'showing_sheet' | 'landlord_report';

// === New Feature Types ===

export type LeaseStatus = 'draft' | 'active' | 'expiring' | 'expired' | 'terminated' | 'renewed';

export interface Lease {
  id: string;
  company_id: string;
  property_id: string;
  tenant_id: string | null;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string | null;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount: number;
  payment_day: number;
  status: LeaseStatus;
  auto_renew: boolean;
  renewal_notice_days: number;
  rent_escalation_pct: number;
  lease_document_url: string | null;
  signed_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  property?: Property;
}

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'emergency';
export type MaintenanceStatus = 'open' | 'in_progress' | 'pending_parts' | 'scheduled' | 'completed' | 'cancelled';
export type MaintenanceCategory = 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest' | 'landscaping' | 'security' | 'general' | 'emergency';

export interface MaintenanceRequest {
  id: string;
  company_id: string;
  property_id: string;
  submitted_by: string | null;
  assigned_to: string | null;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  photos: string[] | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  scheduled_date: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  property?: Property;
  submitter?: Profile;
  assignee?: Profile;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action';
export type NotificationCategory = 'system' | 'application' | 'lease' | 'maintenance' | 'payment' | 'showing' | 'team';

export interface Notification {
  id: string;
  user_id: string;
  company_id: string | null;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  read: boolean;
  action_url: string | null;
  action_label: string | null;
  email_sent: boolean;
  created_at: string;
}

export type ContactType = 'prospect' | 'tenant' | 'vendor' | 'landlord' | 'other';

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: ContactType;
  company_name: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  property_id: string | null;
  last_contacted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Commission {
  id: string;
  company_id: string;
  agent_id: string;
  property_id: string | null;
  lease_id: string | null;
  type: 'lease_signing' | 'renewal' | 'sale' | 'referral';
  amount: number;
  percentage: number | null;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
