import dns from "node:dns";
import type { QuizData } from "@/types/database";

// Force IPv4 resolution to prevent 30-second IPv6 socket timeouts
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignored in non-Node environments
}

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
 * - < 8,000 chars   (~1-4 pages): 10 questions (Phase 1 only)
 * - 8,000 - 25,000  (~5-12 pages): 10 Phase 1 + 15 Phase 2 = 25 questions total
 * - > 25,000 chars  (13+ pages): 10 Phase 1 + 20 Phase 2 = 30 questions total
 */
export function calculateDynamicBankSize(charCount: number): number {
  if (charCount < 8_000) return 10;
  if (charCount < 25_000) return 25;
  return 30;
}

/**
 * Helper to call Gemini REST API with retry, low temperature, and strict JSON mode.
 */
async function callGemini(prompt: string, apiKey: string): Promise<string> {
  let response: Response | null = null;
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25, // Deterministic JSON output
          responseMimeType: "application/json",
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
  const rawText: string | undefined =
    json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error(
      "Gemini returned an empty response. Check your API quota or prompt."
    );
  }

  // Strip accidental markdown fences
  return rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "");
}

/**
 * Builds the strict-JSON prompt for Phase 1.
 * Focused and compact to minimize token latency.
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

DISTRIBUTION:
- Exactly ${easyCount} "easy" questions (foundational definitions, core rules).
- Exactly ${medCount} "medium" questions (application, problem solving).
- Exactly ${hardCount} "hard" questions (synthesis, edge cases, exam traps).

REQUIREMENTS:
- Exactly 4 plausible options (A, B, C, D) per question.
- Only 1 unambiguous correct answer (correctIndex: 0, 1, 2, or 3).
- Explanations must be in clear Arabic, explicitly proving why the answer is correct and why traps are wrong.
- Assign each question a concise Arabic "topic" (e.g. "المتغيرات", "النهايات", "المصفوفات").
- Assign each question a "difficulty" ("easy", "medium", or "hard").
- Scan the material sequentially and cover all main sections.

RETURN ONLY VALID RAW JSON with NO markdown fences, NO backticks:
{
  "version": 1,
  "generatedAt": "${new Date().toISOString()}",
  "sourceTitle": "${sourceTitle}",
  "questions": [
    {
      "id": "q1",
      "question": "نص السؤال باللغة العربية...",
      "options": ["أ", "ب", "ج", "د"],
      "correctIndex": 0,
      "explanation": "شرح الإجابة الصحيحة...",
      "difficulty": "medium",
      "topic": "الموضوع"
    }
  ]
}

ACADEMIC MATERIAL:
${material}`;
}

/**
 * Validates and sanitizes the raw Gemini response into a sound QuizData object.
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
    validQuestions.push({
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
 * Phase 1: Fast in-flight generation (default: 10 high-yield questions).
 * Designed to return in under 6 seconds so uploads feel instantaneous.
 */
export async function generateQuizWithGemini(
  extractedText: string,
  sourceTitle: string,
  targetCount: number = 10
): Promise<QuizData> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY env var. Add it to .env.local to enable quiz generation."
    );
  }

  console.log(
    `[gemini-quiz] [Phase 1] Generating core bank of ${targetCount} questions for "${sourceTitle}"`
  );

  const prompt = buildPrompt(extractedText, sourceTitle, targetCount);
  const rawJson = await callGemini(prompt, apiKey);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error(
      `Gemini returned non-JSON content: ${rawJson.slice(0, 200)}`
    );
  }

  return validateQuizData(parsed);
}

/**
 * Phase 2: Asynchronous background expansion (+15 to +20 complementary questions).
 * Generates non-duplicate questions covering remaining sections and appends them to existing bank.
 */
export async function expandQuizWithGemini(
  extractedText: string,
  sourceTitle: string,
  existingQuiz: QuizData,
  targetAdditionalCount: number = 15
): Promise<QuizData> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY env var for quiz expansion.");
  }

  const existingQuestions = existingQuiz.questions || [];
  const coveredTopics = Array.from(
    new Set(existingQuestions.map((q) => q.topic).filter(Boolean))
  ).join("، ");

  const sampleExisting = existingQuestions
    .slice(0, 5)
    .map((q) => `- ${q.question}`)
    .join("\n");

  const material = extractedText.slice(0, 300_000);
  const easyCount = Math.round(targetAdditionalCount * 0.3);
  const medCount = Math.round(targetAdditionalCount * 0.4);
  const hardCount = targetAdditionalCount - easyCount - medCount;

  console.log(
    `[gemini-quiz] [Phase 2] Expanding bank with +${targetAdditionalCount} complementary questions for "${sourceTitle}"`
  );

  const prompt = `You are an expert academic curriculum designer expanding an existing university exam question bank.
We already generated Part 1 of the quiz for "${sourceTitle}".
Topics already covered: ${coveredTopics || "None specified"}.
Sample existing questions:
${sampleExisting}

YOUR TASK:
Generate exactly ${targetAdditionalCount} NEW, complementary multiple choice questions that DO NOT duplicate existing questions. Focus on uncovered chapters, deeper calculations, application problems, and exam edge cases.

DISTRIBUTION:
- Exactly ${easyCount} "easy" questions
- Exactly ${medCount} "medium" questions
- Exactly ${hardCount} "hard" questions

REQUIREMENTS:
- Exactly 4 plausible options (A, B, C, D) per question.
- 1 unambiguous correct answer (correctIndex: 0..3).
- Explanations in clear Arabic proving why the answer is correct and why traps are wrong.
- Concise Arabic "topic" and "difficulty".

RETURN ONLY VALID RAW JSON with NO markdown fences, NO backticks:
{
  "questions": [
    {
      "id": "new_1",
      "question": "نص السؤال الجديد...",
      "options": ["أ", "ب", "ج", "د"],
      "correctIndex": 0,
      "explanation": "التوضيح باللغة العربية...",
      "difficulty": "medium",
      "topic": "الموضوع"
    }
  ]
}

ACADEMIC MATERIAL:
${material}`;

  const rawJson = await callGemini(prompt, apiKey);
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.warn(`[gemini-quiz] Phase 2 returned invalid JSON, preserving Phase 1 bank.`);
    return existingQuiz;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return existingQuiz;
  }

  const obj = parsed as Record<string, unknown>;
  const rawQuestions = Array.isArray(obj.questions) ? obj.questions : [];
  const validNewQuestions: QuizData["questions"] = [];
  const startIndex = existingQuestions.length;

  for (const [i, q] of rawQuestions.entries()) {
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
      continue;
    }

    let difficulty: "easy" | "medium" | "hard" = "medium";
    if (
      question.difficulty === "easy" ||
      question.difficulty === "medium" ||
      question.difficulty === "hard"
    ) {
      difficulty = question.difficulty;
    }

    const topic = typeof question.topic === "string" ? question.topic.trim() : undefined;

    validNewQuestions.push({
      question: question.question.trim(),
      options: question.options.map((opt) => String(opt).trim()),
      correctIndex: question.correctIndex,
      explanation: question.explanation.trim(),
      difficulty,
      topic,
    });
  }

  if (validNewQuestions.length === 0) {
    console.warn("[gemini-quiz] Phase 2 produced 0 valid questions, keeping Phase 1.");
    return existingQuiz;
  }

  console.log(
    `[gemini-quiz] [Phase 2] Successfully merged ${validNewQuestions.length} new questions. Total bank: ${
      existingQuestions.length + validNewQuestions.length
    } questions.`
  );

  return {
    ...existingQuiz,
    generatedAt: new Date().toISOString(),
    questions: [...existingQuestions, ...validNewQuestions],
  };
}
