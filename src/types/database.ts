/**
 * TypeScript type definitions that mirror the Supabase database schema.
 * These types ensure type safety across all data fetching and rendering.
 *
 * IMPORTANT: Keep these in sync with supabase/schema.sql.
 * In the future, these can be auto-generated using `supabase gen types`.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type UserRole = "super_admin" | "admin" | "user";

export type ResourceType =
  | "summary"
  | "quiz"
  | "past_exam"
  | "guide"
  | "link"
  | "other";

// ─── Table Row Types ────────────────────────────────────────────────────────

export interface University {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Department {
  id: string;
  university_id: string;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
}

export interface Course {
  id: string;
  department_id: string;
  course_code: string | null;
  title: string;
  slug: string;
  description: string | null;
  instructor: string | null;
  semester: string | null;
  display_order: number;
  created_at: string;
}

export interface Resource {
  id: string;
  course_id: string;
  title: string;
  type: ResourceType;
  storage_url: string;
  file_size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  role: UserRole;
  department_id: string | null;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  resource_id: string | null;
  course_id: string | null;
  created_at: string;
}

// ─── Joined / Extended Types ────────────────────────────────────────────────
// Used when fetching data with Supabase joins (e.g., course with its resources)

export interface DepartmentWithCourses extends Department {
  courses: Course[];
}

export interface CourseWithResources extends Course {
  resources: Resource[];
  department?: Department;
}
