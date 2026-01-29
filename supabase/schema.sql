-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES Table (Extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('landlord', 'agent', 'admin')) DEFAULT 'agent',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. AREAS Table (Neighborhoods/Regions)
CREATE TABLE areas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. BUILDINGS Table
CREATE TABLE buildings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  year_built INTEGER,
  total_units INTEGER,
  amenities TEXT[], -- Array of strings
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PROPERTIES Table (Individual Units)
CREATE TABLE properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms NUMERIC(3,1) NOT NULL,
  square_feet INTEGER,
  rent NUMERIC(10,2) NOT NULL,
  deposit NUMERIC(10,2),
  status TEXT CHECK (status IN ('available', 'pending', 'rented', 'maintenance')) DEFAULT 'available',
  available_date DATE,
  description TEXT,
  amenities TEXT[],
  utilities_included TEXT[],
  pet_policy TEXT,
  parking_included BOOLEAN DEFAULT false,
  lockbox_code TEXT, -- SENSITIVE: Only visible to Agents/Admins
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. PROPERTY_PHOTOS Table
CREATE TABLE property_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. APPLICATIONS Table
CREATE TABLE applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  agent_id UUID REFERENCES profiles(id), -- The agent who created/manages this
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  current_address TEXT,
  employer TEXT,
  monthly_income NUMERIC(10,2),
  credit_score INTEGER, -- SENSITIVE
  background_check_passed BOOLEAN, -- SENSITIVE
  income_verified BOOLEAN, -- SENSITIVE
  screening_status TEXT CHECK (screening_status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  status TEXT CHECK (status IN ('new', 'screening', 'approved', 'denied', 'withdrawn')) DEFAULT 'new',
  move_in_date DATE,
  num_occupants INTEGER,
  has_pets BOOLEAN DEFAULT false,
  pet_details TEXT,
  additional_notes TEXT,
  screening_report_url TEXT, -- Link to external PDF/Report
  webhook_sent BOOLEAN DEFAULT false,
  webhook_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ACTIVITY_LOG Table (Audit Trail)
CREATE TABLE activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read (or authenticated), update own
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Areas/Buildings/Photos: Read-only public, Admin/Agent write
CREATE POLICY "Areas are viewable by everyone" ON areas FOR SELECT USING (true);
CREATE POLICY "Buildings are viewable by everyone" ON buildings FOR SELECT USING (true);
CREATE POLICY "Photos are viewable by everyone" ON property_photos FOR SELECT USING (true);

-- Properties: Public read (BUT exclude lockbox_code for public/tenants is tricky in SQL directly without views or specific column grants, simplified here effectively allowing read but handling sensitivity in app logic or separate secure view/function. Ideally, 'property_secure_info' table for lockbox)
CREATE POLICY "Properties are viewable by everyone" ON properties FOR SELECT USING (true);

-- Applications:
-- Agents can see applications they created.
-- Landlords/Admins can see ALL applications.
-- Users cannot generally see others' applications.
CREATE POLICY "Agents see own applications" ON applications FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Admins/Landlords see all applications" ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'landlord')
    )
  );

CREATE POLICY "Agents can insert applications" ON applications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('agent', 'admin')
    )
  );
  
CREATE POLICY "Admins/Landlords can update applications" ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'landlord')
    )
  );
