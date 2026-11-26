-- Migration: 20261126_resource_view_download_counters.sql
--
-- Adds atomic `views_count` and `downloads_count` counters to the resources
-- table, plus two lightweight RPC functions so client code can increment
-- counters without racing: Postgres UPDATE ... SET col = col + 1 is atomic.
--
-- HOW TO APPLY:
--   Run this entire script in Supabase Dashboard → SQL Editor.

-- ─── 1. Add counter columns (idempotent: DO NOTHING if already present) ───────

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS views_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downloads_count INTEGER NOT NULL DEFAULT 0;

-- ─── 2. RPC: increment_resource_views ─────────────────────────────────────────
-- Called when a student opens the in-app PDF reader or lands on the
-- /r/:id watermark shortlink.
-- Security model: invoker must pass a valid resource UUID; non-existent IDs
-- are silently ignored (no error) so the client never needs to retry.

CREATE OR REPLACE FUNCTION increment_resource_views(resource_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE resources
     SET views_count = views_count + 1
   WHERE id = resource_id;
END;
$$;

-- ─── 3. RPC: increment_resource_downloads ────────────────────────────────────
-- Called when a student taps the PDF download button.

CREATE OR REPLACE FUNCTION increment_resource_downloads(resource_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE resources
     SET downloads_count = downloads_count + 1
   WHERE id = resource_id;
END;
$$;

-- ─── 4. Grant EXECUTE to anon role (called from public client-side beacons) ───

GRANT EXECUTE ON FUNCTION increment_resource_views(UUID)     TO anon;
GRANT EXECUTE ON FUNCTION increment_resource_downloads(UUID) TO anon;

-- ─── 5. Performance index on downloads_count for future leaderboard queries ───

CREATE INDEX IF NOT EXISTS idx_resources_downloads_count
  ON resources (downloads_count DESC)
  WHERE status = 'active';
