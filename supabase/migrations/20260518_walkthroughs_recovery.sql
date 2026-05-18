-- Walkthroughs operational hardening (idempotent)
-- 1. Stale-job recovery function — marks jobs that have been stuck too long as failed
-- 2. Cleanup function — deletes failed jobs older than 30 days (caller still needs to clean R2 objects)
-- 3. Per-company concurrency view — used by server-side rate limiting

-- Marks jobs stuck in non-terminal states past their per-state TTL as failed.
-- Safe to run repeatedly; only touches jobs that exceed the TTL thresholds.
CREATE OR REPLACE FUNCTION reap_stale_walkthrough_jobs()
RETURNS TABLE(job_id UUID, prev_status TEXT, age_minutes INT) AS $$
BEGIN
  RETURN QUERY
  UPDATE walkthrough_jobs j
  SET status = 'failed',
      error_message = COALESCE(j.error_message,
        CASE
          WHEN j.status = 'uploading' THEN 'Upload session timed out (no train dispatch within 1 hour)'
          WHEN j.status = 'queued'    THEN 'Stuck in queue past 30 minutes (RunPod did not pick up the job)'
          WHEN j.status = 'training'  THEN 'Training exceeded 1 hour without reporting completion'
          ELSE 'Stale job — unknown state'
        END),
      completed_at = NOW(),
      updated_at = NOW()
  WHERE j.status IN ('uploading','queued','training')
    AND (
      (j.status = 'uploading' AND j.created_at < NOW() - INTERVAL '1 hour') OR
      (j.status = 'queued'    AND j.started_at < NOW() - INTERVAL '30 minutes') OR
      (j.status = 'training'  AND j.started_at < NOW() - INTERVAL '1 hour')
    )
  RETURNING j.id, j.status::TEXT,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(j.started_at, j.created_at)))::INT / 60;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION reap_stale_walkthrough_jobs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reap_stale_walkthrough_jobs() TO service_role;

-- Count of in-flight jobs per company. Used by the rate limiter.
CREATE OR REPLACE FUNCTION count_active_walkthroughs(p_company_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM walkthrough_jobs
  WHERE company_id = p_company_id
    AND status IN ('uploading', 'queued', 'training');
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION count_active_walkthroughs(UUID) TO authenticated, service_role;

-- Hard-delete walkthrough_jobs rows older than 90 days that ended in 'failed'.
-- Useful for keeping the table small. Does NOT clean R2 objects — that's
-- the trainer's job (per-job photos are cleaned on success, R2 lifecycle
-- rules handle the rest).
CREATE OR REPLACE FUNCTION purge_old_failed_walkthroughs()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  WITH d AS (
    DELETE FROM walkthrough_jobs
    WHERE status = 'failed'
      AND completed_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*)::INT INTO deleted_count FROM d;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION purge_old_failed_walkthroughs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_old_failed_walkthroughs() TO service_role;

NOTIFY pgrst, 'reload schema';
