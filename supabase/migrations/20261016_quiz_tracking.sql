-- ─── MIGRATION: 20261016_quiz_tracking.sql ─────────────────────────────────────
-- Future-proof student quiz attempt tracking and granular question diagnostics.
-- Supports anonymous guest sessions today and authenticated student profiles in V2.

-- 1. Create quiz_attempts table (Session-level metrics)
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Nullable user_id allows guest quiz tracking via anonymous session token
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    guest_session_id TEXT, -- e.g. "guest_9a7d3f2c-..." generated in client localStorage
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Performance Metrics
    total_questions INT NOT NULL,
    score INT NOT NULL,
    score_percentage INT NOT NULL,
    difficulty_selected TEXT NOT NULL DEFAULT 'balanced', -- 'balanced' | 'easy' | 'medium' | 'hard' | 'all'
    duration_seconds INT DEFAULT 0,
    
    completed_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create quiz_attempt_answers table (Question-level diagnostics)
-- Enables the "Train My Weaknesses" feature by pinpointing exact topics failed.
CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    
    question_text TEXT NOT NULL,
    selected_option TEXT NOT NULL,
    correct_option TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    difficulty TEXT, -- 'easy' | 'medium' | 'hard'
    topic TEXT,      -- e.g. 'النهايات المثلثية'
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_guest ON quiz_attempts(guest_session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_resource ON quiz_attempts(resource_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course ON quiz_attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_attempt ON quiz_attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_answers_topic ON quiz_attempt_answers(topic);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempt_answers ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Public / Guest Insert: Anyone can record their completed quiz attempt
CREATE POLICY "Allow public insert of quiz attempts"
ON quiz_attempts FOR INSERT
WITH CHECK (true);

-- Public / Guest Insert: Anyone can record the answer details for their attempt
CREATE POLICY "Allow public insert of quiz attempt answers"
ON quiz_attempt_answers FOR INSERT
WITH CHECK (true);

-- Authenticated Read: Students see their own attempts; Admins see all
CREATE POLICY "Users can read own quiz attempts"
ON quiz_attempts FOR SELECT
USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
    ))
);

-- Authenticated Read: Students see their own question breakdown; Admins see all
CREATE POLICY "Users can read own quiz attempt answers"
ON quiz_attempt_answers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM quiz_attempts
        WHERE quiz_attempts.id = quiz_attempt_answers.attempt_id
        AND (
            (auth.uid() IS NOT NULL AND quiz_attempts.user_id = auth.uid())
            OR
            (EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND (profiles.role = 'admin' OR profiles.role = 'super_admin')
            ))
        )
    )
);
