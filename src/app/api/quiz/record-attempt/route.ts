import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import type { RecordAttemptPayload } from "@/types/database";

/**
 * Service-role client to reliably write quiz sessions and answers
 * regardless of guest/authenticated session state.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createAdminClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * POST /api/quiz/record-attempt
 *
 * Records a student's completed quiz attempt and individual question diagnostics.
 * Supports anonymous guest sessions today (via guestSessionId from localStorage)
 * and authenticated user profiles seamlessly when Auth is active.
 */
export async function POST(request: Request) {
  try {
    const body: RecordAttemptPayload = await request.json();

    // 1. Validation of essential fields
    if (
      !body.resourceId ||
      !body.courseId ||
      typeof body.totalQuestions !== "number" ||
      typeof body.score !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing required quiz attempt metrics" },
        { status: 400 }
      );
    }

    // 2. Resolve identity: Check if the user is authenticated via cookies
    let userId: string | null = null;
    try {
      const serverSupabase = await createServerSupabase();
      const {
        data: { user },
      } = await serverSupabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch {
      // Unauthenticated guest request - expected in guest-first mode
    }

    const adminClient = getAdminClient();

    // 3. Insert Master Attempt Row
    const { data: attempt, error: attemptError } = await adminClient
      .from("quiz_attempts")
      .insert({
        user_id: userId,
        guest_session_id: userId ? null : body.guestSessionId || null,
        resource_id: body.resourceId,
        course_id: body.courseId,
        total_questions: body.totalQuestions,
        score: body.score,
        score_percentage: body.scorePercentage,
        difficulty_selected: body.difficultySelected || "balanced",
        duration_seconds: body.durationSeconds || 0,
      })
      .select("id")
      .single();

    if (attemptError) {
      console.error("[quiz-telemetry] Failed to insert attempt:", attemptError);
      return NextResponse.json(
        { error: "Failed to persist quiz attempt" },
        { status: 500 }
      );
    }

    // 4. Bulk Insert Granular Question Diagnostics (if provided)
    if (Array.isArray(body.answers) && body.answers.length > 0) {
      const answerRows = body.answers.map((a) => ({
        attempt_id: attempt.id,
        question_text: a.questionText,
        selected_option: a.selectedOption,
        correct_option: a.correctOption,
        is_correct: a.isCorrect,
        difficulty: a.difficulty || null,
        topic: a.topic || null,
      }));

      const { error: answersError } = await adminClient
        .from("quiz_attempt_answers")
        .insert(answerRows);

      if (answersError) {
        console.warn(
          "[quiz-telemetry] Failed to insert question answers:",
          answersError
        );
        // We do not fail the request if attempt is saved
      }
    }

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[quiz-telemetry] Unexpected error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
