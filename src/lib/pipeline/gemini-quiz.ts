import type { QuizData } from "@/types/database";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates optimal question bank size based on source text density.
 *
 * RULES:
 * - < 8,000 chars  (~1-4 pages, cheat-sheets): 15 questions
 * - 8,000 - 25,000 (~5-12 pages, single lectures): 25 questions
 * - 25,000 - 60,000 (~13-30 pages, chapter summaries): 35 questions
 * - > 60,000 chars (30+ pages, complete syllabus booklets): 50 questions
 */
export function calculateDynamicBankSize(charCount: number): number {
  if (charCount < 8_000) return 15;
  if (charCount < 25_000) return 25;
  if (charCount < 60_000) return 35;
  return 50;
}

/**
 * Builds the strict-JSON prompt for Gemini.
 * Caps at 300,000 characters (~50,000 words), easily ingesting entire course summaries
 * while staying far below Gemini 3.8 Flash's 1-million-token context window.
 */
function buildPrompt(
  extractedText: string,
  sourceTitle: string,
  targetCount: number
): string {
  const material = extractedText.slice(0, 300_000);
  const easyCount = Math.round(targetCount * 0.4);
  const medCount = Math.round(targetCount * 0.4);
  const hardCount = targetCount - easyCount - medCount;

  return `You are an expert academic curriculum designer creating a university exam question bank for Jordanian students.
Given the following academic material, generate exactly ${targetCount} high-yield multiple choice questions.

STRICT DISTRIBUTION RULES:
1. TARGET VOLUME: Exactly ${targetCount} questions.
2. DIFFICULTY STRATIFICATION:
   - Exactly ${easyCount} "easy" questions (foundational definitions, direct properties, core concepts).
   - Exactly ${medCount} "medium" questions (formula application, multi-step problem solving).
   - Exactly ${hardCount} "hard" questions (conceptual synthesis, edge cases, tricky exam traps).
3. SYLLABUS-WIDE COVERAGE:
   - Scan and analyze the ENTIRE material sequentially from page 1 to the final page.
   - Distribute the ${targetCount} questions EVENLY across all sections and chapters (do NOT cluster questions in chapter 1).
4. QUESTION REQUIREMENTS:
   - Each question must have exactly 4 plausible options (A, B, C, D).
   - Only 1 unambiguous correct answer (correctIndex: 0, 1, 2, or 3).
   - Explanations must be in clear Arabic, explicitly proving why the chosen answer is correct and why common pitfalls are wrong.
   - Assign each question a concise Arabic "topic" (e.g. "النهايات المثلثية", "المصفوفات المتماثلة", "قواعد الاشتقاق").
   - Assign each question a "difficulty" ("easy", "medium", or "hard").
   - Do NOT repeat questions, concepts, or distractors.

RETURN ONLY VALID RAW JSON with NO markdown fences, NO backticks, NO extra text:
{
  "version": 1,
  "generatedAt": "${new Date().toISOString()}",
  "sourceTitle": "${sourceTitle}",
  "questions": [
    {
      "id": "q1",
      "question": "ما هي قيمة نهاية د(س) عندما تقترب س من الصفر؟",
      "options": ["1", "0", "غير موجودة", "∞"],
      "correctIndex": 0,
      "explanation": "باستخدام النظرية الأساسية لنهاية جا(س)/س عند س->0 فإن القيمة تساوي 1.",
      "difficulty": "medium",
      "topic": "النهايات المثلثية"
    }
  ]
}

ACADEMIC MATERIAL:
${material}`;
}

/**
 * Validates and sanitizes the raw Gemini response into a sound QuizData object.
 * Tolerates minor omissions (e.g. 33 questions instead of 35) without crashing the pipeline,
 * but requires at least 5 structurally valid questions.
 */
function validateQuizData(raw: unknown): QuizData {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Quiz response is not an object");
  }

  const obj = raw as Record<string, unknown>;

  if (obj.version !== 1) {
    throw new Error(`Unexpected quiz version: ${obj.version}`);
  }

  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    throw new Error("Quiz response has no questions array");
  }

  const validQuestions = [];

  for (const [i, q] of (obj.questions as unknown[]).entries()) {
    if (typeof q !== "object" || q === null) continue;
    const question = q as Record<string, unknown>;

    if (
      typeof question.question !== "string" ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      typeof question.correctIndex !== "number" ||
      question.correctIndex < 0 ||
      question.correctIndex > 3 ||
      typeof question.explanation !== "string"
    ) {
      console.warn(`[gemini-quiz] Skipping malformed question at index ${i}`);
      continue;
    }

    // Sanitize optional difficulty
    let difficulty: "easy" | "medium" | "hard" = "medium";
    if (
      question.difficulty === "easy" ||
      question.difficulty === "medium" ||
      question.difficulty === "hard"
    ) {
      difficulty = question.difficulty;
    }

    // Sanitize optional topic
    const topic = typeof question.topic === "string" ? question.topic.trim() : undefined;
    const id = typeof question.id === "string" ? question.id : `q${i + 1}`;

    validQuestions.push({
      id,
      question: question.question.trim(),
      options: question.options.map((opt) => String(opt).trim()),
      correctIndex: question.correctIndex,
      explanation: question.explanation.trim(),
      difficulty,
      topic,
    });
  }

  if (validQuestions.length < 5) {
    throw new Error(
      `Quiz validation failed: only ${validQuestions.length} valid questions produced (minimum 5 required)`
    );
  }

  return {
    version: 1,
    generatedAt:
      typeof obj.generatedAt === "string"
        ? obj.generatedAt
        : new Date().toISOString(),
    sourceTitle:
      typeof obj.sourceTitle === "string" ? obj.sourceTitle : undefined,
    questions: validQuestions,
  };
}

/**
 * Calls Gemini to generate a quiz from extracted PDF text.
 *
 * @param extractedText  Raw text extracted from the PDF
 * @param sourceTitle    The resource title (used in the quiz metadata)
 * @returns              A validated QuizData object ready to store in DB
 */
export async function generateQuizWithGemini(
  extractedText: string,
  sourceTitle: string,
  targetCount?: number
): Promise<QuizData> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY env var. Add it to .env.local to enable quiz generation."
    );
  }

  const questionCount =
    targetCount ?? calculateDynamicBankSize(extractedText.length);

  console.log(
    `[gemini-quiz] Generating dynamic bank of ${questionCount} questions for "${sourceTitle}" (${extractedText.length} chars extracted)`
  );

  const prompt = buildPrompt(extractedText, sourceTitle, questionCount);

  let response: Response | null = null;
  let lastError: string = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3, // Low temp = deterministic JSON output
          responseMimeType: "application/json", // Strict JSON mode
        },
      }),
    });

    if (response.ok) {
      break;
    }

    lastError = await response.text();
    // Retry on transient high load (503) or rate limit (429)
    if ((response.status === 503 || response.status === 429) && attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * (attempt + 1);
      console.warn(
        `[gemini-quiz] Attempt ${attempt + 1} got ${response.status}. Retrying in ${delay}ms...`
      );
      await sleep(delay);
      continue;
    }

    throw new Error(
      `Gemini API error [${response.status}]: ${lastError.slice(0, 300)}`
    );
  }

  if (!response || !response.ok) {
    throw new Error(`Gemini API call failed: ${lastError.slice(0, 300)}`);
  }

  const json = await response.json();

  // Navigate the Gemini response envelope
  const rawText: string | undefined =
    json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error(
      "Gemini returned an empty response. Check your API quota or prompt."
    );
  }

  // Strip accidental markdown fences if Gemini adds them despite instructions
  const stripped = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error(
      `Gemini returned non-JSON content: ${stripped.slice(0, 200)}`
    );
  }

  return validateQuizData(parsed);
}
