import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeTextForPostgres } from "@/lib/utils";
import { sendOpsAlert } from "@/lib/ops-alerts";
import type { QuizQuestion, QuizData } from "@/types/database";

interface RouteProps {
  params: Promise<{ id: string }>;
}

function verifyAdminAuth(request: Request): boolean {
  const adminSecret = request.headers.get("x-admin-secret");
  return Boolean(
    process.env.ADMIN_SECRET && adminSecret === process.env.ADMIN_SECRET
  );
}

/**
 * Strips Markdown code fences from raw text that may have been
 * copy-pasted directly from a Claude / ChatGPT code block.
 * e.g. ```json\n[...]\n``` → [...]
 */
function stripMarkdownFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```[a-zA-Z]*\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

/**
 * Finds and returns the JSON substring from arbitrary text.
 * Handles:
 *   - Bare JSON arrays/objects
 *   - JSON wrapped inside conversational preamble or markdown
 */
function extractJsonPayload(text: string): string {
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Strip surrounding prose by slicing from the outermost `{` or `[`
  }

  const objStart = text.indexOf("{");
  const objEnd = text.lastIndexOf("}");
  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");

  if (objStart !== -1 && objEnd > objStart && (arrayStart === -1 || objStart < arrayStart)) {
    return text.slice(objStart, objEnd + 1);
  }
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return text.slice(arrayStart, arrayEnd + 1);
  }

  return text;
}

/**
 * Core per-question sanitizer and validator.
 *
 * Accepts two distinct shapes the caller may send:
 *   Shape A (Gemini / standard Molakhasat format):
 *     { question, options: [4 strings], correctIndex: 0-3, explanation }
 *   Shape B (Claude Vision / past-exam digitization format):
 *     { question, options: [4 strings], correctAnswer: "text", explanation }
 *   Shape C (1-indexed correctIndex from manual entry):
 *     { question, options, correctIndex: 1-4, explanation }  → auto-corrected to 0-3
 *
 * Returns a fully typed QuizQuestion or null if the question is unrecoverable.
 */
function sanitizeQuestion(
  raw: unknown,
  index: number
): QuizQuestion | null {
  if (typeof raw !== "object" || raw === null) {
    console.warn(`[quiz-import] Q#${index + 1} rejected: not an object.`);
    return null;
  }

  const q = raw as Record<string, unknown>;

  // ── Validate question stem ──────────────────────────────────────────────
  const questionText =
    typeof q.question === "string" ? q.question.trim() : "";
  if (!questionText) {
    console.warn(`[quiz-import] Q#${index + 1} rejected: empty question stem.`);
    return null;
  }

  // ── Validate & normalize options array ─────────────────────────────────
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    console.warn(
      `[quiz-import] Q#${index + 1} rejected: options must be an array of exactly 4 items (got ${Array.isArray(q.options) ? q.options.length : typeof q.options}).`
    );
    return null;
  }

  const options: string[] = q.options.map((o) => String(o ?? "").trim());

  if (options.some((o) => o.length === 0)) {
    console.warn(`[quiz-import] Q#${index + 1} rejected: one or more options are empty strings.`);
    return null;
  }

  // All 4 options must be unique strings (prevents "correct answer is obvious" bug)
  if (new Set(options).size !== 4) {
    console.warn(`[quiz-import] Q#${index + 1} rejected: duplicate options detected.`);
    return null;
  }

  // ── Resolve correctIndex (accepts camelCase `correctIndex` or snake_case `correct_index`)
  const rawCorrectIdx =
    typeof q.correctIndex === "number"
      ? q.correctIndex
      : typeof q.correct_index === "number"
      ? q.correct_index
      : undefined;

  let correctIndex: number;

  if (typeof rawCorrectIdx === "number") {
    // Handle 1-indexed input (1..4) — auto-correct to 0..3
    if (rawCorrectIdx === 0 || (rawCorrectIdx >= 0 && rawCorrectIdx <= 3)) {
      correctIndex = rawCorrectIdx;
    } else if (rawCorrectIdx === 4) {
      correctIndex = 3;
    } else {
      correctIndex = rawCorrectIdx;
    }

    if (correctIndex < 0 || correctIndex > 3) {
      console.warn(
        `[quiz-import] Q#${index + 1} rejected: correctIndex ${rawCorrectIdx} is out of range [0–3].`
      );
      return null;
    }
  } else if (typeof q.correctAnswer === "string") {
    // Shape B: resolve correctIndex by finding the matching option text
    const matchIdx = options.findIndex(
      (o) =>
        o.toLowerCase().trim() === (q.correctAnswer as string).toLowerCase().trim()
    );
    if (matchIdx === -1) {
      console.warn(
        `[quiz-import] Q#${index + 1} rejected: correctAnswer "${q.correctAnswer}" not found in options list.`
      );
      return null;
    }
    correctIndex = matchIdx;
  } else {
    console.warn(
      `[quiz-import] Q#${index + 1} rejected: no valid correctIndex (number) or correctAnswer (string) provided.`
    );
    return null;
  }

  // ── Build explanation ───────────────────────────────────────────────────
  const explanation =
    typeof q.explanation === "string" && q.explanation.trim()
      ? q.explanation.trim()
      : `الإجابة الصحيحة: ${options[correctIndex]}`;

  // ── Optional metadata ───────────────────────────────────────────────────
  let difficulty: "easy" | "medium" | "hard" = "medium";
  if (q.difficulty === "easy" || q.difficulty === "medium" || q.difficulty === "hard") {
    difficulty = q.difficulty;
  }
  const chapter =
    typeof q.chapter === "string"
      ? sanitizeTextForPostgres(q.chapter) || undefined
      : undefined;
  const topic =
    typeof q.topic === "string"
      ? sanitizeTextForPostgres(q.topic) || undefined
      : undefined;
  const tags = Array.isArray(q.tags)
    ? q.tags
        .map((t) => sanitizeTextForPostgres(typeof t === "string" ? t : String(t ?? "")))
        .filter((t): t is string => Boolean(t))
        .slice(0, 6)
    : undefined;

  return {
    question: questionText,
    options,
    correctIndex,
    explanation: sanitizeTextForPostgres(explanation),
    difficulty,
    ...(chapter ? { chapter } : {}),
    ...(topic ? { topic } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
  };
}

/**
 * POST /api/admin/resources/[id]/quiz/import
 *
 * Tolerant JSON question bank importer for the Admin Dashboard.
 *
 * Request body:
 * {
 *   rawJson: string;          // Raw pasted JSON — fences and preamble are stripped automatically
 *   mode: "replace" | "append"; // "replace" overwrites, "append" merges (deduplicating by question stem)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   imported: number,         // questions accepted
 *   skipped: number,          // questions rejected (validation failure) or deduplicated (append mode)
 *   total: number,            // total questions now in the bank
 *   quizData: QuizData        // the full updated quiz bank written to Supabase
 * }
 */
export async function POST(request: Request, props: RouteProps) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await props.params;
  if (!id) {
    return NextResponse.json({ error: "Missing resource ID" }, { status: 400 });
  }

  // ── Parse request body ──────────────────────────────────────────────────
  let body: { rawJson?: string; mode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "طلب JSON غير صالح. يرجى إرسال { rawJson, mode }." },
      { status: 400 }
    );
  }

  const { rawJson, mode } = body;

  if (!rawJson || typeof rawJson !== "string" || rawJson.trim().length === 0) {
    return NextResponse.json(
      { error: "الحقل rawJson مطلوب ولا يمكن أن يكون فارغاً." },
      { status: 400 }
    );
  }

  if (mode !== "replace" && mode !== "append") {
    return NextResponse.json(
      { error: "الحقل mode يجب أن يكون إما 'replace' أو 'append'." },
      { status: 400 }
    );
  }

  // ── Parse JSON payload (tolerant) ────────────────────────────────────────
  let parsedPayload: unknown;
  try {
    const stripped = stripMarkdownFences(rawJson);
    const extracted = extractJsonPayload(stripped);
    parsedPayload = JSON.parse(extracted);
  } catch (parseErr) {
    return NextResponse.json(
      {
        error: `فشل تحليل الـ JSON. يرجى التأكد من صحة الصيغة. تفاصيل: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      },
      { status: 422 }
    );
  }

  // ── Normalize to raw question list ───────────────────────────────────────
  let rawList: unknown[] = [];

  if (Array.isArray(parsedPayload)) {
    // Direct array of questions: [ { question, options, correctIndex }, ... ]
    rawList = parsedPayload;
  } else if (typeof parsedPayload === "object" && parsedPayload !== null) {
    const obj = parsedPayload as Record<string, unknown>;

    // Handle wrapper objects: { questions: [...] } or { version, questions: [...] }
    if (Array.isArray(obj.questions)) {
      rawList = obj.questions;
    } else {
      // Last-resort: find the first array value inside the object
      for (const val of Object.values(obj)) {
        if (Array.isArray(val) && val.length > 0) {
          rawList = val;
          break;
        }
      }
    }
  }

  if (rawList.length === 0) {
    return NextResponse.json(
      { error: "لم يتم العثور على أي أسئلة في الـ JSON المرسل. تأكد من أن الملف يحتوي على مصفوفة أسئلة." },
      { status: 422 }
    );
  }

  // ── Validate & sanitize each question ────────────────────────────────────
  const incomingQuestions: QuizQuestion[] = [];
  let skipped = 0;

  for (let i = 0; i < rawList.length; i++) {
    const sanitized = sanitizeQuestion(rawList[i], i);
    if (sanitized) {
      incomingQuestions.push(sanitized);
    } else {
      skipped++;
    }
  }

  if (incomingQuestions.length === 0) {
    return NextResponse.json(
      {
        error: `فشل التحقق من صحة جميع الأسئلة (${rawList.length} سؤال محاولة، 0 ناجح). يرجى مراجعة بنية الـ JSON: كل سؤال يحتاج question, options (مصفوفة 4 عناصر), correctIndex (0-3), explanation.`,
      },
      { status: 422 }
    );
  }

  // ── Fetch resource + existing quiz bank ──────────────────────────────────
  const supabase = createAdminClient();

  const { data: resource, error: fetchError } = await supabase
    .from("resources")
    .select("id, title, course_id, quiz_data, status")
    .eq("id", id)
    .single();

  if (fetchError || !resource) {
    return NextResponse.json(
      { error: "المورد المطلوب غير موجود في قاعدة البيانات." },
      { status: 404 }
    );
  }

  // ── Merge logic ──────────────────────────────────────────────────────────
  let finalQuestions: QuizQuestion[];

  if (mode === "replace") {
    // Completely overwrite the bank — straightforward
    finalQuestions = incomingQuestions;
  } else {
    // Append mode: merge incoming with existing, deduplicating by question stem
    const existingQuestions: QuizQuestion[] =
      resource.quiz_data?.questions || [];

    // Normalize existing stems for deduplication comparison
    const existingStems = new Set(
      existingQuestions.map((q) => q.question.trim().toLowerCase())
    );

    let dedupedSkipped = 0;
    const freshQuestions: QuizQuestion[] = [];

    for (const incoming of incomingQuestions) {
      const stem = incoming.question.trim().toLowerCase();
      if (existingStems.has(stem)) {
        // Exact duplicate by question text — skip to avoid confusion in NativeQuiz
        dedupedSkipped++;
        console.log(`[quiz-import] Deduplication: skipping duplicate stem: "${incoming.question.slice(0, 60)}..."`);
      } else {
        freshQuestions.push(incoming);
        existingStems.add(stem); // prevent duplicates within the batch itself
      }
    }

    skipped += dedupedSkipped;
    finalQuestions = [...existingQuestions, ...freshQuestions];
  }

  // ── Build the final QuizData object ──────────────────────────────────────
  const updatedQuizData: QuizData = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceTitle: resource.title,
    questions: finalQuestions,
  };

  // ── Persist to Supabase ───────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("resources")
    .update({ quiz_data: updatedQuizData })
    .eq("id", id);

  if (updateError) {
    console.error(`[quiz-import] Failed to persist quiz data for resource ${id}:`, updateError);
    await sendOpsAlert(
      `🚨 خطأ 500 في استيراد كويز (POST /api/admin/resources/${id}/quiz/import): ${updateError.message}`
    );
    return NextResponse.json(
      { error: `فشل حفظ بنك الأسئلة في قاعدة البيانات: ${updateError.message}` },
      { status: 500 }
    );
  }

  // Invalidate the edge cache so the course page reflects the new quiz bank instantly
  revalidatePath("/");
  if (resource.course_id) {
    revalidatePath("/courses/[slug]", "page");
  }

  const imported = mode === "replace"
    ? incomingQuestions.length
    : finalQuestions.length - (resource.quiz_data?.questions?.length || 0);

  console.log(
    `[quiz-import] ✅ Resource ${id}: mode=${mode}, imported=${imported}, skipped=${skipped}, total=${finalQuestions.length}`
  );

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    total: finalQuestions.length,
    quizData: updatedQuizData,
    message:
      mode === "replace"
        ? `تم استبدال بنك الأسئلة بنجاح. استُورد ${imported} سؤال (تجاهل ${skipped}).`
        : `تم دمج ${imported} سؤال جديد في البنك (تجاهل ${skipped} مكرر أو خاطئ). الإجمالي: ${finalQuestions.length} سؤال.`,
  });
}

