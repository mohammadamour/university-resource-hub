import dns from "node:dns";
import type { QuizData } from "@/types/database";

// Force IPv4 resolution to prevent 30-second IPv6 socket timeouts
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignored in non-Node environments
}

/**
 * Candidate models in order of priority:
 * 1. gemini-3.5-flash: high availability & curriculum quality
 * 2. gemini-3.5-flash-lite: ultra-fast fallback, resilient during 503 demand spikes
 * 3. gemini-flash-lite-latest: secondary fallback
 * (gemini-3.8-flash removed due to gateway stalling on v1beta)
 */
const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
];

function getApiKeys(): string[] {
  const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

// In-memory state for round-robin load distribution and quota cooldowns
let roundRobinIndex = 0;
const keyCooldowns = new Map<string, number>();

/**
 * Returns keys sorted for optimal load balancing:
 * 1. Rotates starting point using round-robin index to distribute RPM/RPD evenly.
 * 2. Deprioritizes keys currently in 429 cooldown so we don't waste 1.5s on dead keys.
 */
function getOrderedCandidateKeys(): string[] {
  const allKeys = getApiKeys();
  if (allKeys.length === 0) return [];

  const now = Date.now();
  // Rotate starting key so successive synthesis requests hit different Google accounts
  const startIndex = roundRobinIndex % allKeys.length;
  const rotated = [
    ...allKeys.slice(startIndex),
    ...allKeys.slice(0, startIndex),
  ];

  const readyKeys: string[] = [];
  const coolingKeys: string[] = [];

  for (const k of rotated) {
    const cooldownExpires = keyCooldowns.get(k) || 0;
    if (now >= cooldownExpires) {
      readyKeys.push(k);
    } else {
      coolingKeys.push(k);
    }
  }

  // Active keys first; cooling keys as emergency last resort
  return [...readyKeys, ...coolingKeys];
}

/**
 * Defensively extracts the JSON string from raw LLM output,
 * stripping markdown fences or conversational preambles.
 */
function extractJsonString(rawText: string): string {
  const trimmed = rawText.trim();
  const unquoted = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  if (
    (unquoted.startsWith("{") && unquoted.endsWith("}")) ||
    (unquoted.startsWith("[") && unquoted.endsWith("]"))
  ) {
    return unquoted;
  }

  const firstBrace = unquoted.indexOf("{");
  const lastBrace = unquoted.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return unquoted.slice(firstBrace, lastBrace + 1);
  }

  const firstBracket = unquoted.indexOf("[");
  const lastBracket = unquoted.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    return unquoted.slice(firstBracket, lastBracket + 1);
  }

  return unquoted;
}

/**
 * Robust caller for Google Gemini REST API.
 * Features:
 *  - Round-robin load balancing across all configured accounts
 *  - 429 cooldown tracking (skips exhausted keys automatically)
 *  - Automatic multi-key pool failover
 *  - Model fallback chain (gemini-3.5-flash -> gemini-flash-lite-latest -> gemini-3.8-flash)
 *  - thinkingBudget: 0 to eliminate 15-second reasoning token lag
 *  - Deterministic JSON mode
 */
async function callGemini(prompt: string): Promise<string> {
  const candidateKeys = getOrderedCandidateKeys();
  if (candidateKeys.length === 0) {
    throw new Error(
      "Missing GEMINI_API_KEY or GEMINI_API_KEYS in .env.local. Please configure at least one key."
    );
  }

  let lastError = "";

  // Try each API key in the prioritized candidate list
  for (let keyIdx = 0; keyIdx < candidateKeys.length; keyIdx++) {
    const apiKey = candidateKeys[keyIdx];
    const keyPreview = apiKey.slice(0, 8) + "..." + apiKey.slice(-4);

    // Try candidate models in prioritized order
    for (const model of CANDIDATE_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // Detect lite models: Google strictly rejects 'thinkingConfig' on lite variants with HTTP 400
      const isLite = model.includes("lite");
      const generationConfig: Record<string, unknown> = {
        temperature: 0.25,
        responseMimeType: "application/json",
      };

      if (!isLite) {
        // Zero thinking budget suppresses long reasoning tokens on full Flash models
        generationConfig.thinkingConfig = {
          thinkingBudget: 0,
        };
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
          }),
          // Strict 9-second timeout per candidate to prevent serverless function hangs
          signal: AbortSignal.timeout(9000),
        });

        if (response.ok) {
          const json = await response.json();
          const rawText: string | undefined =
            json?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!rawText) {
            throw new Error("Gemini returned empty parts in response.");
          }

          // Successfully generated: rotate round-robin counter for next request
          roundRobinIndex = (roundRobinIndex + 1) % candidateKeys.length;
          keyCooldowns.delete(apiKey);

          // Defensively extract and clean JSON
          return extractJsonString(rawText);
        }

        const errorBody = await response.text();
        lastError = `[${model}] HTTP ${response.status}: ${errorBody.slice(0, 200)}`;

        // If daily quota exhausted (429 RESOURCE_EXHAUSTED), mark key with 5-minute cooldown
        if (response.status === 429) {
          console.warn(
            `[gemini-quiz] Key ${keyPreview} hit quota (429) on ${model}. Cooldown set for 5m. Failing over to next key...`
          );
          keyCooldowns.set(apiKey, Date.now() + 5 * 60 * 1000);
          break; // Break model loop, try next API key in pool
        }

        // If 503 (demand spike) or 500 (internal error), try next candidate model immediately
        if (response.status === 503 || response.status === 500) {
          console.warn(
            `[gemini-quiz] Model ${model} returned ${response.status} (server busy). Trying fallback model...`
          );
          continue;
        }

        // If 404 (model deprecated) or 400 (argument mismatch), try next model immediately
        if (response.status === 404 || response.status === 400) {
          continue;
        }
      } catch (networkErr) {
        lastError = `Network or timeout error calling ${model}: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`;
        console.warn(`[gemini-quiz] ${lastError}`);
      }
    }
  }

  throw new Error(`All Gemini API keys and models failed. Last error: ${lastError}`);
}

/**
 * Builds the strict-JSON prompt for Phase 1.
 * Focused and compact to minimize token latency.
 */
function buildPrompt(
  extractedText: string,
  sourceTitle: string,
  targetCount: number = 8
): string {
  const material = extractedText.slice(0, 300_000);
  const easyCount = Math.max(1, Math.round(targetCount * 0.35));
  const medCount = Math.max(1, Math.round(targetCount * 0.45));
  const hardCount = Math.max(1, targetCount - easyCount - medCount);

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

  if (validQuestions.length < 4) {
    throw new Error(
      `Quiz validation failed: only ${validQuestions.length} valid questions produced (minimum 4 required)`
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
  targetCount: number = 8
): Promise<QuizData> {
  console.log(
    `[gemini-quiz] [Phase 1] Generating core bank of ${targetCount} questions for "${sourceTitle}"`
  );

  const prompt = buildPrompt(extractedText, sourceTitle, targetCount);
  const rawJson = await callGemini(prompt);

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
 * Automatically computes a safe, non-hallucinating expansion count based on content length.
 * - Short summaries (< 8,000 chars): 8 high-yield questions
 * - Medium summaries (8,000 - 25,000 chars): 12 questions
 * - Deep/Booklet summaries (25,000+ chars): 18 questions
 */
export function calculateDynamicExpansionCount(textLength: number): number {
  if (textLength < 8_000) return 6;
  return 8; // Cap at 8 questions so expansion always completes in 5-6s and avoids Vercel 15s cutoff
}

/**
 * Phase 2: Asynchronous on-demand expansion (dynamically sized based on material depth).
 * Generates non-duplicate questions covering remaining sections and appends them to existing bank.
 */
export async function expandQuizWithGemini(
  extractedText: string,
  sourceTitle: string,
  existingQuiz: QuizData,
  targetAdditionalCount?: number
): Promise<QuizData> {
  const effectiveCount =
    typeof targetAdditionalCount === "number" && targetAdditionalCount > 0
      ? targetAdditionalCount
      : calculateDynamicExpansionCount(extractedText.length);

  const existingQuestions = existingQuiz.questions || [];
  const coveredTopics = Array.from(
    new Set(existingQuestions.map((q) => q.topic).filter(Boolean))
  ).join("، ");

  // Provide up to 40 existing question stems to guarantee zero duplicates across infinite expands
  const sampleExisting = existingQuestions
    .slice(0, 40)
    .map((q, idx) => `${idx + 1}. ${q.question}`)
    .join("\n");

  const material = extractedText.slice(0, 300_000);
  const easyCount = Math.round(effectiveCount * 0.3);
  const medCount = Math.round(effectiveCount * 0.4);
  const hardCount = effectiveCount - easyCount - medCount;

  console.log(
    `[gemini-quiz] [Phase 2] Expanding bank with +${effectiveCount} complementary questions for "${sourceTitle}" (Material: ${extractedText.length} chars)`
  );

  const prompt = `You are an expert academic curriculum designer expanding an existing university exam question bank.
We already generated ${existingQuestions.length} questions for "${sourceTitle}".
Topics already covered: ${coveredTopics || "None specified"}.
Sample existing questions (DO NOT REPEAT OR REPHRASE THESE):
${sampleExisting}

YOUR TASK:
Generate exactly ${effectiveCount} NEW, complementary multiple choice questions that DO NOT duplicate existing questions. Focus on uncovered chapters, deeper calculations, application problems, and exam edge cases.

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

  const rawJson = await callGemini(prompt);
  let parsed: unknown;
  try {
    const cleanJson = extractJsonString(rawJson);
    parsed = JSON.parse(cleanJson);
  } catch (parseErr) {
    console.error(`[gemini-quiz] Phase 2 JSON parse error:`, parseErr);
    throw new Error(`فشل تحليل استجابة الذكاء الاصطناعي أثناء التوسيع: ${rawJson.slice(0, 150)}...`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("استجابة الذكاء الاصطناعي ليست كائناً صالحاً.");
  }

  let rawQuestions: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawQuestions = parsed;
  } else {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.questions)) {
      rawQuestions = obj.questions;
    } else if (Array.isArray(obj.new_questions)) {
      rawQuestions = obj.new_questions;
    } else if (Array.isArray(obj.quiz)) {
      rawQuestions = obj.quiz;
    } else {
      for (const val of Object.values(obj)) {
        if (Array.isArray(val) && val.length > 0) {
          rawQuestions = val;
          break;
        }
      }
    }
  }

  const validNewQuestions: QuizData["questions"] = [];

  for (const [, q] of rawQuestions.entries()) {
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
    console.error("[gemini-quiz] Phase 2 produced 0 valid questions. Raw was:", rawJson.slice(0, 300));
    throw new Error("لم ينتج الذكاء الاصطناعي أي أسئلة صالحة إضافية متطابقة مع المعايير.");
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
