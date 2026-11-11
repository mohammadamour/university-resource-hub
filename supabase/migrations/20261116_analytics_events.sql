-- Analytics Events Table
-- Tracks lightweight behavioural events (PDF opens, shares, bookmarks, quiz starts/completes).
-- No PII is stored — only anonymous guest session UUIDs generated client-side.
--
-- WHY a dedicated table instead of reusing quiz_attempts?
-- quiz_attempts is structured for quiz-specific data (scores, answers, duration).
-- analytics_events is a generic event log that covers every other interaction
-- (PDF opens, downloads, WhatsApp shares, bookmark toggles) where we just need
-- a timestamp + event type + optional JSONB metadata bag.

CREATE TABLE IF NOT EXISTS analytics_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       TEXT        NOT NULL,                           -- e.g. 'pdf_reader_open'
  resource_id      UUID        REFERENCES resources(id) ON DELETE SET NULL,
  course_id        UUID        REFERENCES courses(id) ON DELETE SET NULL,
  course_slug      TEXT,                                           -- denormalised for fast filtering
  resource_title   TEXT,                                           -- denormalised so queries don't need a JOIN
  metadata         JSONB       DEFAULT '{}'::jsonb,                -- flexible event-specific data bag
  guest_session_id TEXT,                                           -- anonymous UUID from localStorage
  user_agent       TEXT,                                           -- raw browser UA string
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Indexes for the most common dashboard queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_type    ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_resource ON analytics_events(resource_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_course  ON analytics_events(course_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);

-- Enable RLS (row-level security) — required for Supabase tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow any visitor (no login) to INSERT events.
-- Matches the same open-insert pattern used for quiz_attempts.
-- SELECT is intentionally not granted to anonymous users — only the service-role
-- key (used by our API route and admin dashboard) can read events.
CREATE POLICY "Allow public insert of analytics events"
  ON analytics_events
  FOR INSERT
  WITH CHECK (true);

