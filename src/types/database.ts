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

  // Extended Applicant Info (SingleKey-style fields)
  combined_household_income: number | null;    // Total income of all applicants on lease
  employment_status: string | null;            // full-time, part-time, self-employed, retired, unemployed
  employment_duration: string | null;          // How long at current employer
  previous_addresses: string | null;           // JSON array of previous addresses (last 3)
  current_rent: number | null;                 // What they currently pay in rent
  current_landlord_name: string | null;        // Reference: current landlord
  current_landlord_phone: string | null;       // Reference: landlord phone
  total_debt: number | null;                   // Total outstanding debt
  num_vehicles: number | null;                 // Number of vehicles
  is_smoker: boolean | null;                   // Smoking status
  government_id_verified: boolean | null;      // ID matches application info

  // Screening Results (SENSITIVE: Only visible to landlords/admins)
  screening_status: ScreeningStatus;
  credit_score: number | null;
  background_check_passed: boolean | null;
  criminal_check_passed: boolean | null;       // Criminal record check result
  public_records_clear: boolean | null;        // No bankruptcies, collections, legal cases
  income_verified: boolean | null;
  screening_report_url: string | null;
  singlekey_report_url: string | null;         // SingleKey PDF report URL
  screening_completed_at: string | null;

  // Computed / stored ratios
  income_to_rent_ratio: number | null;         // yearly_income / yearly_rent (e.g., 5.5 = 5.5x)
  yearly_rent_cost: number | null;             // rent * 12
  dti_ratio: number | null;                    // debt-to-income ratio as percentage

  // Workflow
  status: ApplicationStatus;
  denial_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
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
  employment_status?: string;
  employment_duration?: string;
  monthly_income?: number;
  combined_household_income?: number;
  move_in_date?: string;
  num_occupants: number;
  has_pets: boolean;
  pet_details?: string;
  current_rent?: number;
  current_landlord_name?: string;
  current_landlord_phone?: string;
  total_debt?: number;
  num_vehicles?: number;
  is_smoker?: boolean;
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

  // Video walkthrough (mandatory protocol per Joseph's guidance)
  video_walkthrough_url?: string | null;

  // Workflow gate tracking
  workflow_phase?: RentalWorkflowPhase;
  inspection_status?: InspectionGateStatus;

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

// === Rental Workflow & Inspection Types ===

// 8-phase rental workflow tracking
export type RentalWorkflowPhase =
  | 'onboarding'        // Phase 1: Property profile being built
  | 'inspection'        // Phase 2: Pre-rental inspection in progress
  | 'listing'           // Phase 3: Listed & marketing
  | 'communication'     // Phase 4: Lead communication & vetting
  | 'application'       // Phase 5: Application & tenant vetting
  | 'documents'         // Phase 6: Document management & e-signing
  | 'payment'           // Phase 7: Payment collection
  | 'handoff'           // Phase 8: Key handoff & move-in
  | 'occupied';         // Property is occupied / active lease

export type InspectionGateStatus = 'not_started' | 'in_progress' | 'passed' | 'failed' | 'overridden';

export type InspectionItemStatus = 'pass' | 'fail' | 'not_checked';

export interface InspectionTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  items: InspectionTemplateItem[];
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspectionTemplateItem {
  id: string;
  label: string;
  category: string; // e.g., 'kitchen', 'bathroom', 'electrical', 'safety', 'general'
  description?: string;
  required: boolean;
}

export interface Inspection {
  id: string;
  company_id: string;
  property_id: string;
  template_id: string | null;
  inspected_by: string;         // agent user ID
  inspected_by_name: string;    // agent name for display
  status: InspectionGateStatus;
  notes: string | null;
  signed_at: string | null;     // digital signature timestamp
  landlord_notified_at: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  property?: Property;
  items?: InspectionItem[];
  inspector?: Profile;
}

export interface InspectionItem {
  id: string;
  inspection_id: string;
  label: string;
  category: string;
  status: InspectionItemStatus;
  notes: string | null;
  photo_urls: string[] | null;
  // If failed: maintenance request generated
  maintenance_request_id: string | null;
  landlord_override: boolean;       // landlord acknowledged and declined to fix
  landlord_override_at: string | null;
  landlord_override_reason: string | null;
  created_at: string;
  updated_at: string;
}

// Key Handoff tracking (Phase 8)
export type KeyHandoffMethod = 'in_person' | 'concierge' | 'lockbox' | 'other';

export interface KeyHandoff {
  id: string;
  company_id: string;
  property_id: string;
  lease_id: string | null;
  tenant_name: string;
  handoff_method: KeyHandoffMethod;
  handoff_details: string | null;  // e.g., lockbox code, concierge name
  move_in_date: string;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// LS Capital Group — Rental Protocol Pre-Rental Checklist
// Source: "Rental check list .docx.pdf" — official agent walkthrough protocol
export const DEFAULT_INSPECTION_ITEMS: InspectionTemplateItem[] = [
  // ── Kitchen ──────────────────────────────────────────────────────
  { id: 'kitchen_fridge', label: 'Fridge is working', category: 'kitchen', required: true },
  { id: 'kitchen_oven', label: 'Oven is working, turn on all elements', category: 'kitchen', required: true },
  { id: 'kitchen_dishwasher', label: 'Start a cycle on the dishwasher', category: 'kitchen', required: false },
  { id: 'kitchen_cabinets', label: 'Cabinets are cleaned out', category: 'kitchen', required: true },
  { id: 'kitchen_shelves', label: 'Shelves are installed', category: 'kitchen', required: true },
  { id: 'kitchen_water', label: 'All water sources are working — check hot water as well', category: 'kitchen', required: true },
  { id: 'kitchen_silicone', label: 'Silicone is installed on the sink (if applicable) and counter', category: 'kitchen', required: false },
  { id: 'kitchen_leaks', label: 'No leaks on the dishwasher and sink', category: 'kitchen', required: true },
  // ── Bathroom ─────────────────────────────────────────────────────
  { id: 'bathroom_sink', label: 'Check sink (hot/cold water)', category: 'bathroom', required: true },
  { id: 'bathroom_shower', label: 'Check shower (hot/cold water)', category: 'bathroom', required: true },
  { id: 'bathroom_toilet', label: 'Toilet flushes', category: 'bathroom', required: true },
  { id: 'bathroom_shower_rod', label: 'Shower rod is installed (if applicable)', category: 'bathroom', required: false },
  { id: 'bathroom_window_screens', label: 'Window screens are installed and in working order', category: 'bathroom', required: true },
  { id: 'bathroom_french_doors', label: 'Plastic is removed from French doors', category: 'bathroom', required: false },
  // ── General ──────────────────────────────────────────────────────
  { id: 'general_cleanliness', label: 'Overall cleanliness of the apartment', category: 'general', required: true },
  { id: 'general_paint', label: 'Any touch-ups to paint necessary?', category: 'general', required: true },
  { id: 'general_plugs', label: 'Check all plugs', category: 'general', required: true },
  { id: 'general_lights', label: 'Check all lights', category: 'general', required: true },
];

// Tenant Vetting Protocol — screening checklist (from rental protocol document)
export const TENANT_VETTING_CHECKLIST = [
  // ── Screening (18+ years old) ────────────────────────────────────
  { id: 'vetting_credit', label: 'A full credit check', category: 'screening', required: true },
  { id: 'vetting_regis', label: 'Regis Record check', category: 'screening', required: true },
  { id: 'vetting_criminal', label: 'Criminal Record check', category: 'screening', required: true },
  { id: 'vetting_income_ratio', label: 'Income to rent ratio = max 30%', category: 'screening', required: true },
  { id: 'vetting_proof_income', label: '3 months proof of income', category: 'screening', required: true },
  { id: 'vetting_application', label: 'Full application filled out', category: 'screening', required: true },
  // ── Documents to sign ────────────────────────────────────────────
  { id: 'doc_building_regs', label: 'Building regulations', category: 'documents', required: true },
  { id: 'doc_hydro_consent', label: 'Hydro Consent form', category: 'documents', required: true },
  { id: 'doc_lease', label: 'Lease', category: 'documents', required: true },
  { id: 'doc_parking_lease', label: 'Parking lease', category: 'documents', required: false },
  { id: 'doc_cannabis_form', label: 'Cannabis form', category: 'documents', required: true },
];
