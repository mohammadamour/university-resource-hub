import dns from "node:dns";
import type { QuizData, QuizQuestion } from "@/types/database";

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

// ─── Grounded CoT & Automated Verification Pipeline ──────────────────────────

/**
 * Raw generated question contract emitted by the Grounded CoT model call.
 * Forces derivation & source grounding BEFORE answer selection.
 */
interface RawGeneratedQuestion {
  id?: string;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
  source_quote?: string;
  question: string;
  step_by_step_derivation: string;
  correct_answer: string;
  distractors: string[];
}

/**
 * Evaluates raw question output, verifies uniqueness, and deterministically
 * shuffles options using the Fisher-Yates algorithm to eradicate position bias.
 */
function buildShuffledQuestion(
  raw: unknown,
  index: number,
  phase: string
): QuizQuestion | null {
  if (typeof raw !== "object" || raw === null) {
    console.warn(`[gemini-quiz] [${phase}] Question #${index + 1} rejected: raw item is not an object.`);
    return null;
  }

  const q = raw as Record<string, unknown>;

  const questionStem = typeof q.question === "string" ? q.question.trim() : "";
  if (!questionStem) {
    console.warn(`[gemini-quiz] [${phase}] Question #${index + 1} rejected: question stem is missing.`);
    return null;
  }

  // Handle both Grounded CoT schema (correct_answer + distractors) and legacy fallback
  let rawOptions: string[] = [];
  let rawCorrectAnswer = "";

  if (typeof q.correct_answer === "string" && Array.isArray(q.distractors)) {
    rawCorrectAnswer = q.correct_answer.trim();
    const cleanDistractors = q.distractors
      .map((d) => String(d ?? "").trim())
      .filter((d) => d.length > 0);

    if (!rawCorrectAnswer || cleanDistractors.length !== 3) {
      console.warn(
        `[gemini-quiz] [${phase}] Question #${index + 1} rejected: expected 1 correct answer + 3 distractors, got ${cleanDistractors.length} distractors.`
      );
      return null;
    }

    rawOptions = [rawCorrectAnswer, ...cleanDistractors];
  } else if (Array.isArray(q.options) && q.options.length === 4 && typeof q.correctIndex === "number") {
    // Legacy fallback compatibility
    const cleanOpts = q.options.map((o) => String(o ?? "").trim());
    if (cleanOpts.some((o) => o.length === 0) || q.correctIndex < 0 || q.correctIndex >= 4) {
      return null;
    }
    rawCorrectAnswer = cleanOpts[q.correctIndex];
    rawOptions = cleanOpts;
  } else {
    console.warn(`[gemini-quiz] [${phase}] Question #${index + 1} rejected: invalid options structure.`);
    return null;
  }

  // Deduplication guard: all 4 options must be strictly unique strings
  const uniqueOptions = new Set(rawOptions);
  if (uniqueOptions.size !== 4) {
    console.warn(
      `[gemini-quiz] [${phase}] Question #${index + 1} rejected: non-unique options detected (${uniqueOptions.size}/4 unique).`
    );
    return null;
  }

  // Deterministic Fisher-Yates shuffle
  const shuffled = [...rawOptions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const correctIndex = shuffled.indexOf(rawCorrectAnswer);
  if (correctIndex === -1) {
    console.warn(`[gemini-quiz] [${phase}] Question #${index + 1} rejected: correct answer lost in shuffle.`);
    return null;
  }

  // Build clean, informative explanation
  const derivation = typeof q.step_by_step_derivation === "string" ? q.step_by_step_derivation.trim() : "";
  const legacyExplanation = typeof q.explanation === "string" ? q.explanation.trim() : "";
  const quote = typeof q.source_quote === "string" ? q.source_quote.trim() : "";

  let finalExplanation = derivation || legacyExplanation || `الإجابة الصحيحة: ${rawCorrectAnswer}`;
  if (quote && !finalExplanation.includes(quote)) {
    finalExplanation += `\n\n📖 من نص الملخص: "${quote}"`;
  }

  let difficulty: "easy" | "medium" | "hard" = "medium";
  if (q.difficulty === "easy" || q.difficulty === "medium" || q.difficulty === "hard") {
    difficulty = q.difficulty;
  }

  const topic = typeof q.topic === "string" && q.topic.trim() ? q.topic.trim() : undefined;

  return {
    question: questionStem,
    options: shuffled,
    correctIndex,
    explanation: finalExplanation,
    difficulty,
    topic,
  };
}

/**
 * Builds the Grounded Chain-of-Thought (CoT) prompt for baseline quiz generation.
 */
function buildGroundedPrompt(
  extractedText: string,
  sourceTitle: string,
  targetCount: number = 8
): string {
  const material = extractedText.slice(0, 300_000);
  const easyCount = Math.max(1, Math.round(targetCount * 0.35));
  const medCount = Math.max(1, Math.round(targetCount * 0.45));
  const hardCount = Math.max(1, targetCount - easyCount - medCount);

  return `You are an expert academic professor creating an exam question bank for university students in Jordan.
Given the following academic material, generate exactly ${targetCount} high-yield multiple choice questions.

DISTRIBUTION:
- Exactly ${easyCount} "easy" questions (foundational definitions, core rules).
- Exactly ${medCount} "medium" questions (application, direct problem solving).
- Exactly ${hardCount} "hard" questions (synthesis, edge cases, exam traps).

STRICT GENERATION RULES:
1. SOURCE GROUNDING: Every question MUST cite an exact verbatim source_quote (5-20 words in Arabic or English) directly from the provided text. DO NOT invent topics or formulas not present in the material.
2. SOLVE BEFORE KEYING (Chain-of-Thought):
   - You MUST write a detailed step_by_step_derivation proving the answer before stating the correct_answer.
   - For Math/Logic: Write the complete calculation/proof step-by-step.
   - For Code/CS: Trace variables and line-by-line execution.
   - For Theory/Skills: Cite the exact rule or concept contrast.
3. DISTRACTORS: Provide exactly 3 realistic, plausible incorrect options (distractors) based on common student misconceptions. DO NOT make distractors obviously ridiculous.
4. LANGUAGE: Questions and derivations must be in academic Arabic. Code syntax, formulas, and technical acronyms should remain in their standard English notation.

RETURN ONLY VALID RAW JSON with NO markdown fences, NO backticks:
{
  "version": 1,
  "generatedAt": "${new Date().toISOString()}",
  "sourceTitle": "${sourceTitle}",
  "questions": [
    {
      "id": "q1",
      "topic": "الموضوع (e.g. المنطق الرقمي، المصفوفات)",
      "difficulty": "medium",
      "source_quote": "اقتباس نصي حرفي من الملخص المرفق...",
      "question": "نص السؤال باللغة العربية...",
      "step_by_step_derivation": "خطوات الحل الرياضي أو المنطقي بالتفصيل لإثبات الإجابة...",
      "correct_answer": "نص الإجابة الصحيحة فقط",
      "distractors": [
        "الخيار الخاطئ الأول (مبني على خطأ شائع)",
        "الخيار الخاطئ الثاني",
        "الخيار الخاطئ الثالث"
      ]
    }
  ]
}

ACADEMIC MATERIAL:
${material}`;
}

/**
 * Builds the Grounded Chain-of-Thought (CoT) prompt for on-demand bank expansion.
 */
function buildExpansionGroundedPrompt(
  extractedText: string,
  sourceTitle: string,
  existingQuestions: QuizQuestion[],
  effectiveCount: number
): string {
  const sampleExisting = existingQuestions
    .slice(0, 40)
    .map((q, idx) => `${idx + 1}. ${q.question}`)
    .join("\n");

  const coveredTopics = Array.from(
    new Set(existingQuestions.map((q) => q.topic).filter(Boolean))
  ).join("، ");

  const material = extractedText.slice(0, 300_000);
  const easyCount = Math.round(effectiveCount * 0.3);
  const medCount = Math.round(effectiveCount * 0.4);
  const hardCount = effectiveCount - easyCount - medCount;

  return `You are an expert academic curriculum designer expanding an existing university exam question bank.
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

STRICT RULES:
1. SOURCE GROUNDING: Every question MUST cite an exact verbatim source_quote from the text.
2. SOLVE BEFORE KEYING: Provide step_by_step_derivation proving the answer before giving correct_answer.
3. DISTRACTORS: Provide exactly 3 plausible distractors reflecting common errors.
4. No duplicates with previous questions.

RETURN ONLY VALID RAW JSON with NO markdown fences, NO backticks:
{
  "questions": [
    {
      "id": "new_1",
      "topic": "الموضوع الجديد",
      "difficulty": "medium",
      "source_quote": "اقتباس حرفي من المادة...",
      "question": "نص السؤال الجديد...",
      "step_by_step_derivation": "خطوات البرهان أو الحل...",
      "correct_answer": "الإجابة الصحيحة",
      "distractors": ["خيار خاطئ 1", "خيار خاطئ 2", "خيار خاطئ 3"]
    }
  ]
}

ACADEMIC MATERIAL:
${material}`;
}

/**
 * Automated Blind Solver Consensus Pass:
 * Evaluates candidate questions independently without answer keys or derivations.
 * Questions that produce key disagreement or low confidence are filtered out.
 */
async function auditQuizWithBlindSolver(
  candidates: QuizQuestion[]
): Promise<QuizQuestion[]> {
  if (candidates.length === 0) return [];

  const letterLabels = ["A", "B", "C", "D"];
  const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

  // Use distinct letter labels [A], [B], [C], [D] to prevent digit collision with math values
  const formattedQuestions = candidates
    .map((q, idx) => {
      const opts = q.options.map((opt, oIdx) => `  [${letterLabels[oIdx]}] ${opt}`).join("\n");
      return `=== Question ${idx} ===\n${q.question}\nOptions:\n${opts}`;
    })
    .join("\n\n");

  const blindPrompt = `You are a strict, top-tier academic exam grader and auditor.
Below are ${candidates.length} multiple-choice exam questions with options labeled [A], [B], [C], [D].
Your job is to independently solve each question strictly and objectively.

FOR EACH QUESTION:
1. Carefully solve it based on academic correctness (math calculations, code syntax, logical facts, or definitions).
2. Determine which option letter [A, B, C, or D] is the ONLY correct answer.
3. If an option is unambiguously correct, assign "confidence": "high", specify "selectedOption": "A" | "B" | "C" | "D", AND quote the exact option text in "selectedText".
4. If the question contains calculation errors, ambiguous wording, multiple valid options, or no valid option, assign "confidence": "invalid" or "low".

RETURN ONLY VALID RAW JSON with NO markdown fences:
{
  "evaluations": [
    {
      "questionIndex": 0,
      "selectedOption": "A",
      "selectedText": "exact text of chosen option",
      "confidence": "high",
      "rationale": "Brief scientific verification..."
    }
  ]
}

QUESTIONS TO SOLVE:
${formattedQuestions}`;

  const rawAuditJson = await callGemini(blindPrompt);
  const cleanAuditJson = extractJsonString(rawAuditJson);
  const parsedAudit = JSON.parse(cleanAuditJson);

  interface EvaluationItem {
    questionIndex: number;
    selectedOption?: string;
    selectedText?: string;
    selectedIndex?: number;
    confidence: string;
    rationale?: string;
  }

  let evaluationsList: EvaluationItem[] = [];
  if (parsedAudit && Array.isArray(parsedAudit.evaluations)) {
    evaluationsList = parsedAudit.evaluations;
  } else if (Array.isArray(parsedAudit)) {
    evaluationsList = parsedAudit;
  }

  const evalMap = new Map<number, EvaluationItem>();
  for (const item of evaluationsList) {
    if (typeof item.questionIndex === "number") {
      evalMap.set(item.questionIndex, item);
    }
  }

  const verified: QuizQuestion[] = [];

  for (let idx = 0; idx < candidates.length; idx++) {
    const candidate = candidates[idx];
    const evaluation = evalMap.get(idx);

    if (!evaluation) {
      console.warn(`[gemini-quiz] Blind solver skipped question #${idx + 1}. Retaining as fallback.`);
      verified.push(candidate);
      continue;
    }

    // Resolve solver index from letter label A..D or numerical fallback
    let solverIndex = -1;
    if (typeof evaluation.selectedOption === "string") {
      const letter = evaluation.selectedOption.trim().toUpperCase();
      if (letter in letterToIndex) {
        solverIndex = letterToIndex[letter];
      }
    }
    if (solverIndex === -1 && typeof evaluation.selectedIndex === "number") {
      solverIndex = evaluation.selectedIndex;
    }

    // Dual-check: Match by option index OR direct option text match
    const isLabelMatch = solverIndex === candidate.correctIndex;
    const correctText = candidate.options[candidate.correctIndex]?.trim().toLowerCase() || "";
    const solverText = (evaluation.selectedText || "").trim().toLowerCase();
    const isTextMatch = Boolean(solverText && (solverText === correctText || correctText.includes(solverText) || solverText.includes(correctText)));

    const isMatch = isLabelMatch || isTextMatch;
    const isHighConfidence = evaluation.confidence?.toLowerCase() === "high";

    if (isMatch && isHighConfidence) {
      verified.push(candidate);
    } else {
      const solverLabel = solverIndex >= 0 ? `[${letterLabels[solverIndex] || solverIndex}]` : "INVALID";
      const candLabel = `[${letterLabels[candidate.correctIndex] || candidate.correctIndex}]`;
      console.warn(
        `[gemini-quiz] ❌ Blind solver rejected question #${idx + 1} ("${candidate.question.slice(0, 45)}..."): ` +
        `Generator key=${candLabel}, Solver key=${solverLabel} (Text: "${solverText}" vs "${correctText}") ` +
        `(Confidence: ${evaluation.confidence}, Rationale: ${evaluation.rationale || "N/A"})`
      );
    }
  }

  return verified;
}

/**
 * Unified generation and dual-pass verification runner.
 */
async function runGenerationAndVerification(
  prompt: string,
  phaseName: string
): Promise<QuizQuestion[]> {
  const rawJson = await callGemini(prompt);
  let parsed: unknown;
  try {
    const cleanJson = extractJsonString(rawJson);
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    throw new Error(`Gemini returned invalid JSON in ${phaseName}: ${rawJson.slice(0, 200)}`);
  }

  let rawList: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.questions)) rawList = obj.questions;
    else if (Array.isArray(obj.new_questions)) rawList = obj.new_questions;
    else {
      for (const val of Object.values(obj)) {
        if (Array.isArray(val) && val.length > 0) {
          rawList = val;
          break;
        }
      }
    }
  }

  // Layer 1 & 2: Field validation + in-memory Fisher-Yates shuffle
  const candidates: QuizQuestion[] = [];
  for (let i = 0; i < rawList.length; i++) {
    const shuffled = buildShuffledQuestion(rawList[i], i, phaseName);
    if (shuffled) {
      candidates.push(shuffled);
    }
  }

  if (candidates.length === 0) {
    throw new Error(`No valid candidate questions produced in ${phaseName}.`);
  }

  console.log(
    `[gemini-quiz] [${phaseName}] Generated ${candidates.length} candidates with Grounded CoT & Fisher-Yates shuffle. Running Blind Solver Audit...`
  );

  // Layer 3: Automated Blind Solver Consensus Pass
  let verified: QuizQuestion[] = [];
  try {
    verified = await auditQuizWithBlindSolver(candidates);
  } catch (auditErr) {
    console.warn(
      `[gemini-quiz] [${phaseName}] Blind solver audit encountered non-fatal error: ${
        auditErr instanceof Error ? auditErr.message : String(auditErr)
      }. Retaining shuffled candidates.`
    );
    verified = candidates;
  }

  console.log(
    `[gemini-quiz] [${phaseName}] Verification complete: ${verified.length}/${candidates.length} passed consensus audit.`
  );

  // Safety floor: if audit was too aggressive, retain candidates to avoid an empty quiz
  if (verified.length < 3 && candidates.length >= 3) {
    console.warn(
      `[gemini-quiz] [${phaseName}] Strict audit passed fewer than 3 questions (${verified.length}/${candidates.length}). Reverting to candidates.`
    );
    return candidates;
  }

  return verified;
}

/**
 * Phase 1: Fast in-flight generation with Grounded CoT and Blind Solver Verification.
 */
export async function generateQuizWithGemini(
  extractedText: string,
  sourceTitle: string,
  targetCount: number = 8
): Promise<QuizData> {
  console.log(
    `[gemini-quiz] [Phase 1] Generating core bank of ${targetCount} questions for "${sourceTitle}" with Grounded CoT & Blind Audit`
  );

  const prompt = buildGroundedPrompt(extractedText, sourceTitle, targetCount);
  const questions = await runGenerationAndVerification(prompt, "Phase 1 - Baseline");

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceTitle,
    questions,
  };
}

/**
 * Automatically computes a safe, non-hallucinating expansion count based on content length.
 */
export function calculateDynamicExpansionCount(textLength: number): number {
  if (textLength < 8_000) return 6;
  return 8; // Cap at 8 questions so expansion always completes in 5-6s and avoids Vercel 15s cutoff
}

/**
 * Phase 2: Asynchronous on-demand expansion with Grounded CoT and Blind Solver Verification.
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

  console.log(
    `[gemini-quiz] [Phase 2] Expanding bank with +${effectiveCount} questions for "${sourceTitle}" with Grounded CoT & Blind Audit`
  );

  const prompt = buildExpansionGroundedPrompt(
    extractedText,
    sourceTitle,
    existingQuestions,
    effectiveCount
  );

  const newVerifiedQuestions = await runGenerationAndVerification(prompt, "Phase 2 - Expansion");

  return {
    ...existingQuiz,
    generatedAt: new Date().toISOString(),
    questions: [...existingQuestions, ...newVerifiedQuestions],
  };
}
