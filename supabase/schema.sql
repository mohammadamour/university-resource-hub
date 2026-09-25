-- ============================================================================
-- Molakhasat (ملخصات) — Master Database Schema
-- ============================================================================
-- This schema is the single source of truth for the platform's data model.
-- It is designed to support multi-university scaling from Day 1, even though
-- V1 only serves Jadara University.
--
-- Architecture: University → Department → Course → Resource
-- Auth: Supabase Auth → Profiles (with RBAC roles)
-- Personalization: Bookmarks (user ↔ resource)
-- ============================================================================

-- ─── ENUMS ──────────────────────────────────────────────────────────────────

-- Role-Based Access Control tiers
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'user');

-- Resource types for categorization and UI badge rendering
CREATE TYPE resource_type AS ENUM ('summary', 'quiz', 'past_exam', 'guide', 'link', 'other');

-- ─── UNIVERSITIES ───────────────────────────────────────────────────────────
-- V1: Only "Jadara" exists. The frontend hard-assumes this.
-- Future: Ambassadors from other universities can be onboarded.

CREATE TABLE universities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed Jadara as the default university
INSERT INTO universities (name, slug) VALUES ('جامعة جدارا', 'jadara');

-- ─── DEPARTMENTS ────────────────────────────────────────────────────────────
-- Real departments (IT, SWE) + "fake" departments (University Electives,
-- Placement Exams) to capture cross-department courses.

CREATE TABLE departments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id   UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  display_order   INT DEFAULT 0,         -- Controls UI ordering on landing page
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(university_id, slug)
);

-- ─── COURSES ────────────────────────────────────────────────────────────────

CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  course_code     TEXT,                   -- e.g., "CS101" (nullable for electives)
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  instructor      TEXT,                   -- Doctor name (optional in V1, used for filtering later)
  semester        TEXT,                   -- e.g., "Fall 2026" (optional in V1)
  display_order   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department_id, slug)
);

-- ─── RESOURCES ──────────────────────────────────────────────────────────────

CREATE TABLE resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  type            resource_type NOT NULL DEFAULT 'other',
  storage_url     TEXT NOT NULL,          -- Full URL to Cloudflare R2 or external link
  file_size_bytes BIGINT,                 -- For displaying file size in the UI
  uploaded_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── PROFILES ───────────────────────────────────────────────────────────────
-- Extends Supabase Auth users with platform-specific data.
-- The `role` field drives all RBAC policies.

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  role            user_role NOT NULL DEFAULT 'user',
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,  -- For admins: their assigned department
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── BOOKMARKS ──────────────────────────────────────────────────────────────
-- Join table for user favorites. A user can bookmark courses or resources.

CREATE TABLE bookmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_id     UUID REFERENCES resources(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  -- A user can only bookmark the same item once
  UNIQUE(user_id, resource_id),
  UNIQUE(user_id, course_id),
  -- At least one of resource_id or course_id must be set
  CHECK (resource_id IS NOT NULL OR course_id IS NOT NULL)
);

-- ─── INDEXES ────────────────────────────────────────────────────────────────
-- Performance indexes for the most common query patterns.

CREATE INDEX idx_departments_university ON departments(university_id);
CREATE INDEX idx_courses_department ON courses(department_id);
CREATE INDEX idx_resources_course ON resources(course_id);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ─── ROW LEVEL SECURITY (RLS) ──────────────────────────────────────────────
-- Enable RLS on all tables. This is the security backbone.

ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- ─── PUBLIC READ POLICIES (Anonymous Access) ────────────────────────────────
-- Anyone (including guests without an account) can read content.
-- This is critical for frictionless Sanafer access.

CREATE POLICY "Public read: universities"
  ON universities FOR SELECT
  USING (true);

CREATE POLICY "Public read: departments"
  ON departments FOR SELECT
  USING (true);

CREATE POLICY "Public read: courses"
  ON courses FOR SELECT
  USING (true);

CREATE POLICY "Public read: resources"
  ON resources FOR SELECT
  USING (true);

-- ─── PROFILE POLICIES ──────────────────────────────────────────────────────

CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ─── BOOKMARK POLICIES ─────────────────────────────────────────────────────

CREATE POLICY "Users can read own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- ─── ADMIN WRITE POLICIES ──────────────────────────────────────────────────
-- Admins can manage resources within their assigned department.
-- Super Admins can manage everything.

CREATE POLICY "Admins can insert resources"
  ON resources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'
        OR (
          profiles.role = 'admin'
          AND profiles.department_id = (
            SELECT department_id FROM courses WHERE courses.id = course_id
          )
        )
      )
    )
  );

CREATE POLICY "Admins can update resources"
  ON resources FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'
        OR (
          profiles.role = 'admin'
          AND profiles.department_id = (
            SELECT department_id FROM courses WHERE courses.id = resources.course_id
          )
        )
      )
    )
  );

CREATE POLICY "Admins can delete resources"
  ON resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'
        OR (
          profiles.role = 'admin'
          AND profiles.department_id = (
            SELECT department_id FROM courses WHERE courses.id = resources.course_id
          )
        )
      )
    )
  );

-- ─── SUPER ADMIN POLICIES ──────────────────────────────────────────────────
-- Only the founder (super_admin) can manage universities and departments.

CREATE POLICY "Super admin: manage universities"
  ON universities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin: manage departments"
  ON departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admin: manage courses"
  ON courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ─── AUTO-CREATE PROFILE ON SIGNUP ──────────────────────────────────────────
-- When a user signs up via Supabase Auth, automatically create a profile row.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
