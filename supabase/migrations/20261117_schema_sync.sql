-- ─── MIGRATION: 20261117_schema_sync.sql ──────────────────────────────────────
-- Synchronizes production columns that were added manually in Supabase Dashboard
-- with SQL migration history, and tightens anonymous write policies on quiz tables.

-- 1. Courses: Exam countdown columns (already typed in src/types/database.ts)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS midterm_exam_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS final_exam_date DATE DEFAULT NULL;

-- 2. Resources: Curation shelves, link platforms, and first-page thumbnails
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS external_platform TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT NULL;

-- Composite index for ordered shelf queries per course
CREATE INDEX IF NOT EXISTS idx_resources_featured_order
ON resources(course_id, is_featured, display_order);

-- 3. Tighten Quiz Tracking RLS (C-03)
-- /api/quiz/record-attempt inserts rows using the server-side SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS automatically. Dropping the permissive public INSERT policies stops
-- direct abuse via the public browser ANON_KEY without affecting student quiz tracking.
DROP POLICY IF EXISTS "Allow public insert of quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Allow public insert of quiz attempt answers" ON quiz_attempt_answers;

