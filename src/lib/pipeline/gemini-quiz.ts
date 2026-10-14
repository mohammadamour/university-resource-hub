import type { QuizData } from "@/types/database";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

const NUM_QUESTIONS = 10;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Builds the strict-JSON prompt for Gemini.
 * We cap the input at 15,000 chars to stay within context limits.
 */
function buildPrompt(extractedText: string, sourceTitle: string): string {
  const material = extractedText.slice(0, 15_000);
  return `You are an educational quiz generator for university students.
Given the following Arabic/English study material, generate exactly ${NUM_QUESTIONS} multiple choice questions.

RULES:
- Each question must have exactly 4 options (A, B, C, D)
- The correct answer index is 0-based (0 = A, 1 = B, 2 = C, 3 = D)
- Explanations should be in Arabic
- Questions should test deep understanding, not just memorization
- Distribute difficulty: 40% easy, 40% medium, 20% hard
- Do NOT repeat questions or options

RETURN ONLY valid JSON with NO markdown fences, NO extra text — exactly this shape:
{
  "version": 1,
  "generatedAt": "<ISO 8601 timestamp>",
  "sourceTitle": "${sourceTitle}",
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0,
      "explanation": "..."
    }
  ]
}

STUDY MATERIAL:
${material}`;
}

/**
 * Validates that the raw Gemini response is a structurally sound QuizData object.
 * Throws if invalid so the caller can fall back or mark the resource as rejected.
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

  for (const [i, q] of (obj.questions as unknown[]).entries()) {
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
      throw new Error(`Question at index ${i} is malformed`);
    }
  }

  return raw as QuizData;
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
  sourceTitle: string
): Promise<QuizData> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY env var. Add it to .env.local to enable quiz generation."
    );
  }

  const prompt = buildPrompt(extractedText, sourceTitle);

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
