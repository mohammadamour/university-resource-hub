-- ─── MIGRATION: 20261020_metadata_expansion.sql ──────────────────────────────
-- Expands the resources table to support:
-- 1. Automatic page counts and SHA-256 duplicate defense
-- 2. Hierarchical exam scope (midterm, final, other)
-- 3. Academic year currency (defaults to 2025/2026)
-- 4. Contributor / author credits and instructor relevance
-- 5. Quick uploader caveats / descriptions

ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS page_count INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS file_hash TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS target_exam TEXT NOT NULL DEFAULT 'other',
ADD COLUMN IF NOT EXISTS academic_year TEXT NOT NULL DEFAULT '2025/2026',
ADD COLUMN IF NOT EXISTS professor_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Performance and Deduplication Indexes
CREATE INDEX IF NOT EXISTS idx_resources_file_hash ON resources(file_hash);
CREATE INDEX IF NOT EXISTS idx_resources_target_exam ON resources(target_exam);
CREATE INDEX IF NOT EXISTS idx_resources_academic_year ON resources(academic_year);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC);
