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

export type TargetExam = "midterm" | "final" | "other";

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

export type ResourceStatus = "processing" | "active" | "pending" | "rejected";

export interface QuizQuestion {
  question: string;
  options: string[]; // Always exactly 4 options
  correctIndex: number; // 0-indexed (0 to 3)
  explanation: string; // Explanation of the correct answer
  // Optional metadata for adaptive testing and diagnostic categorization
  difficulty?: "easy" | "medium" | "hard";
  topic?: string;
  subtopic?: string;
  tags?: string[];
}

export interface QuizData {
  version: 1; // For future schema migrations
  questions: QuizQuestion[];
  generatedAt: string; // ISO timestamp
  sourceTitle?: string; // Title of the source material
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
  // Ingestion pipeline & quiz fields
  status?: ResourceStatus;
  quiz_data?: QuizData | null;
  source_text?: string | null;
  is_admin_uploaded?: boolean;
  // Metadata & scope extensions
  page_count?: number | null;
  file_hash?: string | null;
  target_exam?: TargetExam | string | null;
  academic_year?: string | null;
  professor_name?: string | null;
  author_name?: string | null;
  description?: string | null;
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

// ─── Quiz Attempt & Diagnostics Tracking Types ──────────────────────────────

export type QuizDifficulty = "easy" | "medium" | "hard";
export type QuizSelectionMode = "balanced" | "easy" | "medium" | "hard" | "all";

export interface QuizAttempt {
  id: string;
  user_id: string | null;
  guest_session_id: string | null;
  resource_id: string;
  course_id: string;
  total_questions: number;
  score: number;
  score_percentage: number;
  difficulty_selected: string;
  duration_seconds: number;
  completed_at: string;
}

export interface QuizAttemptAnswer {
  id: string;
  attempt_id: string;
  question_text: string;
  selected_option: string;
  correct_option: string;
  is_correct: boolean;
  difficulty: string | null;
  topic: string | null;
  created_at: string;
}

/**
 * Payload sent from <NativeQuiz /> to /api/quiz/record-attempt upon completion
 */
export interface RecordAttemptPayload {
  resourceId: string;
  courseId: string;
  guestSessionId?: string | null;
  totalQuestions: number;
  score: number;
  scorePercentage: number;
  difficultySelected: string;
  durationSeconds: number;
  answers: {
    questionText: string;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    difficulty?: string;
    topic?: string;
  }[];
}

