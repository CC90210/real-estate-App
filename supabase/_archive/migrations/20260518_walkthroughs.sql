-- PropFlow 3D Gaussian Splat Walkthroughs
-- Tables: walkthrough_jobs (job lifecycle + share token + R2 keys)
-- RLS: company-scoped via get_user_company_id()
-- Public viewing: by share_token via admin client (bypasses RLS, narrow query)

CREATE TABLE IF NOT EXISTS walkthrough_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','uploading','queued','training','succeeded','failed')),
  photo_count      INT NOT NULL DEFAULT 0 CHECK (photo_count >= 0 AND photo_count <= 500),
  runpod_job_id    TEXT,
  error_message    TEXT,
  progress_pct     INT NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  share_token      TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64'),
  splat_r2_key     TEXT,
  preview_r2_key   TEXT,
  splat_size_bytes BIGINT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_walkthrough_jobs_property ON walkthrough_jobs(property_id);
CREATE INDEX IF NOT EXISTS idx_walkthrough_jobs_company  ON walkthrough_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_walkthrough_jobs_token    ON walkthrough_jobs(share_token);
CREATE INDEX IF NOT EXISTS idx_walkthrough_jobs_status   ON walkthrough_jobs(status) WHERE status IN ('queued','training');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_walkthrough_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_walkthrough_jobs_updated_at ON walkthrough_jobs;
CREATE TRIGGER trg_walkthrough_jobs_updated_at
  BEFORE UPDATE ON walkthrough_jobs
  FOR EACH ROW EXECUTE FUNCTION set_walkthrough_jobs_updated_at();

-- Row-level security
ALTER TABLE walkthrough_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "walkthrough_jobs_company_select" ON walkthrough_jobs;
CREATE POLICY "walkthrough_jobs_company_select" ON walkthrough_jobs
  FOR SELECT USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "walkthrough_jobs_company_insert" ON walkthrough_jobs;
CREATE POLICY "walkthrough_jobs_company_insert" ON walkthrough_jobs
  FOR INSERT WITH CHECK (company_id = get_user_company_id());

DROP POLICY IF EXISTS "walkthrough_jobs_company_update" ON walkthrough_jobs;
CREATE POLICY "walkthrough_jobs_company_update" ON walkthrough_jobs
  FOR UPDATE USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "walkthrough_jobs_company_delete" ON walkthrough_jobs;
CREATE POLICY "walkthrough_jobs_company_delete" ON walkthrough_jobs
  FOR DELETE USING (company_id = get_user_company_id());

NOTIFY pgrst, 'reload schema';
