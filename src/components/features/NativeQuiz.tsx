"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type {
  QuizData,
  QuizQuestion,
  QuizSelectionMode,
  RecordAttemptPayload,
} from "@/types/database";
import { track } from "@/lib/analytics";
import { getOrCreateGuestId } from "@/lib/guest-session";

export interface NativeQuizProps {
  quizData: QuizData;
  sourceTitle?: string;
  defaultOpen?: boolean;
  resourceId?: string;
  courseId?: string;
  onClose?: () => void;
}

const OPTION_LETTERS = ["أ", "ب", "ج", "د"];

export interface ShuffledQuizQuestion extends QuizQuestion {
  originalCorrectIndex: number;
}

interface UserAnswer {
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
  questionText: string;
  selectedOption: string;
  correctOption: string;
  difficulty?: string;
  topic?: string;
}

// ─── UTILITIES: Shuffling & Dynamic Sampling ────────────────────────────────

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Shuffles the options of a single question and remaps correctIndex to prevent
 * students from memorizing option letters (A/B/C/D) rather than concepts.
 */
function shuffleQuestionOptions(question: QuizQuestion): ShuffledQuizQuestion {
  const correctOptionText = question.options[question.correctIndex];
  const shuffledOptions = shuffleArray(question.options);
  const newCorrectIndex = shuffledOptions.indexOf(correctOptionText);

  return {
    ...question,
    options: shuffledOptions,
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
    originalCorrectIndex: question.correctIndex,
  };
}

interface SampleResult {
  questions: ShuffledQuizQuestion[];
  backfillNotice?: string;
}

/**
 * Dynamically samples a subset of questions from the bank according to volume & mode.
 * Features priority backfill if a requested difficulty tier has fewer questions than requested.
 */
function sampleAndShuffle(
  bank: QuizQuestion[],
  targetCount: number,
  mode: QuizSelectionMode
): SampleResult {
  const effectiveCount = Math.min(targetCount, bank.length);

  if (mode === "balanced") {
    const easyTarget = Math.max(1, Math.round(effectiveCount * 0.4));
    const medTarget = Math.max(1, Math.round(effectiveCount * 0.4));
    const hardTarget = Math.max(1, effectiveCount - easyTarget - medTarget);

    const easyPool = shuffleArray(bank.filter((q) => q.difficulty === "easy"));
    const medPool = shuffleArray(bank.filter((q) => q.difficulty === "medium"));
    const hardPool = shuffleArray(bank.filter((q) => q.difficulty === "hard"));

    const picked: QuizQuestion[] = [
      ...easyPool.slice(0, easyTarget),
      ...medPool.slice(0, medTarget),
      ...hardPool.slice(0, hardTarget),
    ];

    if (picked.length < effectiveCount) {
      const pickedSet = new Set(picked);
      const remaining = bank.filter((q) => !pickedSet.has(q));
      picked.push(...shuffleArray(remaining).slice(0, effectiveCount - picked.length));
    }

    return {
      questions: shuffleArray(picked).slice(0, effectiveCount).map(shuffleQuestionOptions),
    };
  }

  if (mode === "all") {
    return {
      questions: shuffleArray(bank).map(shuffleQuestionOptions),
    };
  }

  // Targeted difficulty mode with graceful fallback
  const primaryPool = shuffleArray(bank.filter((q) => q.difficulty === mode));
  const picked = primaryPool.slice(0, effectiveCount);
  let backfillNotice: string | undefined;

  if (picked.length < effectiveCount) {
    const needed = effectiveCount - picked.length;
    const fallbackPool = shuffleArray(bank.filter((q) => q.difficulty !== mode));
    const backfilled = fallbackPool.slice(0, needed);
    picked.push(...backfilled);

    const modeLabels: Record<string, string> = {
      easy: "السهلة",
      medium: "المتوسطة",
      hard: "المتقدمة",
    };
    backfillNotice = `تم تضمين ${primaryPool.length} أسئلة من المستوى المطلوب + ${backfilled.length} أسئلة مساندة لعدم توفر المزيد من الأسئلة ${modeLabels[mode] || ""} في هذا الملخص.`;
  }

  return {
    questions: shuffleArray(picked).map(shuffleQuestionOptions),
    backfillNotice,
  };
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function NativeQuiz({
  quizData,
  sourceTitle,
  defaultOpen = false,
  resourceId,
  courseId,
  onClose,
}: NativeQuizProps) {
  const bank: QuizQuestion[] = quizData?.questions || [];
  const bankSize = bank.length;

  // Initial volume selection (10 questions is our smart default)
  const defaultCount = useMemo(() => (bankSize <= 10 ? bankSize : 10), [bankSize]);

  // Session & UI States
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isConfiguring, setIsConfiguring] = useState(bankSize > 10 && !defaultOpen);
  const [selectedCount, setSelectedCount] = useState<number>(defaultCount);
  const [selectedMode, setSelectedMode] = useState<QuizSelectionMode>("balanced");

  // Active sampled questions for this session
  const [sessionData, setSessionData] = useState<SampleResult>(() =>
    sampleAndShuffle(bank, defaultCount, "balanced")
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // Local Storage Previous Attempt History (Zero-login guest retention)
  const [lastAttempt, setLastAttempt] = useState<{
    score: number;
    total: number;
    percentage: number;
    completedAt: number;
  } | null>(null);

  useEffect(() => {
    if (!resourceId) return;
    try {
      const raw = localStorage.getItem("molakhasat_quiz_history");
      if (raw) {
        const history = JSON.parse(raw);
        if (history[resourceId]) {
          setLastAttempt(history[resourceId]);
        }
      }
    } catch {
      // Safe fallback for restricted or private browsing modes
    }
  }, [resourceId]);

  // Diagnostics Timing & Beacon Safeguards
  const startTimeRef = useRef<number>(Date.now());
  const hasLoggedAttemptRef = useRef<boolean>(false);
  const hasTrackedStartRef = useRef<boolean>(false);

  const trackQuizStart = useCallback(
    (questionCount: number, isRestart = false) => {
      hasTrackedStartRef.current = true;
      track({
        eventType: "quiz_start",
        resourceId,
        courseId,
        resourceTitle: sourceTitle,
        metadata: {
          question_count: questionCount,
          difficulty_mode: selectedMode,
          bank_size: bankSize,
          is_restart: isRestart,
        },
      });
    },
    [resourceId, courseId, sourceTitle, selectedMode, bankSize]
  );

  const activeQuestions = sessionData.questions;
  const totalQuestions = activeQuestions.length;
  const currentQuestion: ShuffledQuizQuestion | undefined = activeQuestions[currentIndex];

  const score = useMemo(
    () => answers.filter((a) => a.isCorrect).length,
    [answers]
  );

  const scorePercentage = useMemo(() => {
    if (totalQuestions === 0) return 0;
    return Math.round((score / totalQuestions) * 100);
  }, [score, totalQuestions]);

  // Start session with chosen parameters
  const handleStartSession = useCallback(() => {
    const sampled = sampleAndShuffle(bank, selectedCount, selectedMode);
    setSessionData(sampled);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setAnswers([]);
    setIsFinished(false);
    setShowReview(false);
    setIsConfiguring(false);
    setIsOpen(true);
    startTimeRef.current = Date.now();
    hasLoggedAttemptRef.current = false;

    trackQuizStart(sampled.questions.length, false);
  }, [bank, selectedCount, selectedMode, trackQuizStart]);

  // Option selection
  const handleSelectOption = useCallback(
    (index: number) => {
      if (isAnswered || !currentQuestion) return;

      // Fallback for defaultOpen standalone quizzes that skip the launcher button
      if (!hasTrackedStartRef.current) {
        trackQuizStart(totalQuestions, false);
      }

      const isCorrect = index === currentQuestion.correctIndex;
      setSelectedOption(index);
      setIsAnswered(true);

      setAnswers((prev) => [
        ...prev,
        {
          questionIndex: currentIndex,
          selectedIndex: index,
          isCorrect,
          questionText: currentQuestion.question,
          selectedOption: currentQuestion.options[index],
          correctOption: currentQuestion.options[currentQuestion.correctIndex],
          difficulty: currentQuestion.difficulty,
          topic: currentQuestion.topic,
        },
      ]);
    },
    [isAnswered, currentQuestion, currentIndex, totalQuestions, trackQuizStart]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, totalQuestions]);

  // Restart draws a FRESH random sample and fresh option shuffle from the bank
  const handleRestart = useCallback(() => {
    const sampled = sampleAndShuffle(bank, selectedCount, selectedMode);
    setSessionData(sampled);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setAnswers([]);
    setIsFinished(false);
    setShowReview(false);
    startTimeRef.current = Date.now();
    hasLoggedAttemptRef.current = false;

    trackQuizStart(sampled.questions.length, true);
  }, [bank, selectedCount, selectedMode, trackQuizStart]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsConfiguring(bankSize > 10);
    if (onClose) onClose();
  }, [bankSize, onClose]);

  // Keyboard navigation: 1-4 for options, Enter/Space for next
  useEffect(() => {
    if (!isOpen || isConfiguring || isFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAnswered) {
        if (["1", "Digit1"].includes(e.code) || e.key === "1") handleSelectOption(0);
        else if (["2", "Digit2"].includes(e.code) || e.key === "2") handleSelectOption(1);
        else if (["3", "Digit3"].includes(e.code) || e.key === "3") handleSelectOption(2);
        else if (["4", "Digit4"].includes(e.code) || e.key === "4") handleSelectOption(3);
      } else {
        if (e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isConfiguring, isAnswered, isFinished, handleSelectOption, handleNext]);

  // ─── TELEMETRY BEACON & LOCAL STORAGE: Log completed attempt ─────────────
  useEffect(() => {
    if (!isFinished || hasLoggedAttemptRef.current || !resourceId || !courseId) return;
    hasLoggedAttemptRef.current = true;

    // Save to local storage for anonymous guest retention
    try {
      const LOCAL_KEY = "molakhasat_quiz_history";
      const existingRaw = localStorage.getItem(LOCAL_KEY);
      const history = existingRaw ? JSON.parse(existingRaw) : {};
      const newAttempt = {
        score,
        total: activeQuestions.length,
        percentage: scorePercentage,
        completedAt: Date.now(),
      };
      history[resourceId] = newAttempt;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(history));
      setLastAttempt(newAttempt);
    } catch {
      // Ignore storage errors in private browsing
    }

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - startTimeRef.current) / 1000)
    );

    const payload: RecordAttemptPayload = {
      resourceId,
      courseId,
      guestSessionId: getOrCreateGuestId(),
      totalQuestions: activeQuestions.length,
      score,
      scorePercentage,
      difficultySelected: selectedMode,
      durationSeconds,
      answers: answers.map((a) => ({
        questionText: a.questionText,
        selectedOption: a.selectedOption,
        correctOption: a.correctOption,
        isCorrect: a.isCorrect,
        difficulty: a.difficulty,
        topic: a.topic,
      })),
    };

    fetch("/api/quiz/record-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.warn("[quiz] Failed to log attempt telemetry:", err);
    });

    // Track quiz_complete alongside the existing attempt record
    // Metadata gives us score distribution for understanding how hard our quizzes are
    track({
      eventType: "quiz_complete",
      resourceId,
      courseId,
      resourceTitle: sourceTitle,
      metadata: {
        score,
        total_questions: activeQuestions.length,
        score_percentage: scorePercentage,
        duration_seconds: durationSeconds,
        difficulty_mode: selectedMode,
      },
    });
  }, [
    isFinished,
    resourceId,
    courseId,
    sourceTitle,
    activeQuestions.length,
    score,
    scorePercentage,
    selectedMode,
    answers,
  ]);

  if (!quizData || bankSize === 0) {
    return null;
  }

  // ─── STATE 1: Closed Trigger Banner (Docked Compact Bar) ────────────────────
  if (!isOpen) {
    return (
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">🎯</span>
          <span className="text-xs sm:text-sm font-bold text-ink truncate">
            {lastAttempt
              ? `آخر نتيجة: ${lastAttempt.score}/${lastAttempt.total} (${lastAttempt.percentage}%)`
              : "كويز تفاعلي لاختبار الفهم"}
          </span>
          {lastAttempt ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#D9EFE5] border border-[#14664A]/30 px-2 py-0.5 text-[10px] font-bold text-[#14664A] shrink-0">
              <span>{lastAttempt.percentage >= 80 ? "🏆" : "✨"}</span>
              <span>مكتمل</span>
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-hi px-2 py-0.5 text-[10px] font-bold text-ink shrink-0">
              {bankSize} سؤالاً
            </span>
          )}
        </div>

        <button
          type="button"
          data-quiz-start="true"
          onClick={() => {
            setIsOpen(true);
            setIsConfiguring(bankSize > 10);
            if (bankSize <= 10) {
              handleStartSession();
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-btn px-3.5 py-1.5 text-xs font-bold text-btn-ink shadow-2xs transition-all hover:opacity-90 active:scale-95 cursor-pointer shrink-0"
        >
          <span>{lastAttempt ? "إعادة الكويز ↺" : "ابدأ الكويز"}</span>
          <span className="text-[10px]">❯</span>
        </button>
      </div>
    );
  }

  // ─── STATE 2: Launcher & Session Customizer Modal ────────────────────────────
  if (isConfiguring) {
    return (
      <div
        dir="rtl"
        className="rounded-[24px] border border-line bg-surface p-5 sm:p-7 shadow-xl transition-all animate-in fade-in-50 duration-200"
      >
        {/* Mobile Grabber Bar */}
        <div aria-hidden="true" className="w-10 h-1.5 rounded-full bg-line mx-auto mb-3 sm:hidden" />

        <div className="flex items-center justify-between pb-3.5 border-b border-line">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚡</span>
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-bold text-ink">
                إعداد الكويز
              </h3>
              <p className="text-xs text-muted">
                يتوفر في هذا الملخص بنك يضم {bankSize} سؤالاً تفاعلياً، ولكل سؤال شرح
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-line bg-paper text-sm font-bold text-muted hover:border-ink/40 hover:text-ink active:scale-95 transition-all cursor-pointer"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        <div className="my-5 space-y-5">
          {/* Section 1: Question Count Selector */}
          <div className="space-y-2.5">
            <label className="text-xs sm:text-sm font-bold text-ink block">
              1. عدد الأسئلة المطلوبة:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { count: 5, label: "5", note: "سريع" },
                { count: 10, label: "10", note: "موصى به" },
                { count: 20, label: "20", note: "مكثف" },
                { count: bankSize, label: "الكل", note: `${bankSize} سؤال` },
              ]
                .filter((item, idx, arr) => {
                  if (item.count > bankSize && item.count !== bankSize) return false;
                  return arr.findIndex((x) => x.count === item.count) === idx;
                })
                .map((item) => {
                  const isSelected = selectedCount === item.count;
                  return (
                    <button
                      key={item.count}
                      type="button"
                      onClick={() => setSelectedCount(item.count)}
                      className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-2 border-btn bg-btn text-btn-ink font-bold shadow-xs"
                          : "border border-line bg-paper text-ink hover:border-ink/40"
                      }`}
                    >
                      <span className="font-heading text-lg sm:text-xl font-bold leading-tight">{item.label}</span>
                      <span className={`text-[11px] mt-0.5 ${isSelected ? "text-btn-ink/80" : "text-muted"}`}>
                        {item.note}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Section 2: Difficulty Mode Selector */}
          <div className="space-y-2.5">
            <label className="text-xs sm:text-sm font-bold text-ink block">
              2. مستوى الصعوبة:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  mode: "balanced" as QuizSelectionMode,
                  title: "متوازن (مزيج دراسي)",
                  desc: "40% سهل، 40% متوسط، و20% متقدم",
                },
                {
                  mode: "easy" as QuizSelectionMode,
                  title: "مفاهيم وأساسيات (سهل)",
                  desc: "تعريفات ونظريات مباشرة",
                },
                {
                  mode: "medium" as QuizSelectionMode,
                  title: "مستوى امتحاني (متوسط)",
                  desc: "تطبيق القوانين وحل المسائل المعيارية",
                },
                {
                  mode: "hard" as QuizSelectionMode,
                  title: "تحدي واستنتاج (متقدم)",
                  desc: "أسئلة مهارات عليا وتركات امتحانية",
                },
              ].map((item) => {
                const isSelected = selectedMode === item.mode;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => setSelectedMode(item.mode)}
                    className={`flex items-start gap-3 rounded-2xl border p-3 text-start transition-all cursor-pointer ${
                      isSelected
                        ? "border-2 border-ink bg-hi/15 text-ink shadow-xs"
                        : "border border-line bg-paper text-ink hover:border-ink/40"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border mt-0.5 ${
                        isSelected ? "border-ink" : "border-muted"
                      }`}
                    >
                      {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block font-bold text-xs sm:text-sm text-ink">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-muted leading-tight mt-0.5 block">
                        {item.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-line">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[46px] rounded-xl border border-line bg-paper px-4 text-xs sm:text-sm font-semibold text-muted hover:text-ink hover:border-ink/40 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleStartSession}
            className="min-h-[50px] flex-1 sm:flex-initial rounded-xl bg-btn px-6 text-sm font-heading font-bold text-btn-ink shadow-md transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>ابدأ الاختبار · {selectedCount} أسئلة</span>
            <span>⚡</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── STATE 4: Results (Score Card & Analytics) ──────────────────────────────
  if (isFinished) {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset =
      circumference - (scorePercentage / 100) * circumference;

    const feedback =
      scorePercentage >= 80
        ? { mark: "ممتاز!", title: "أداء رائع ومتميز", desc: "أظهرت استيعاباً عميقاً لمحتوى المادة الدراسية." }
        : scorePercentage >= 50
        ? { mark: "جيد جداً!", title: "محاولة موفقة", desc: "لديك فهم جيد للمفاهيم الأساسية مع إمكانية التحسين." }
        : { mark: "مراجعة!", title: "بحاجة لمزيد من التركيز", desc: "ننصح بإعادة قراءة الملخص والتركيز على النقاط غير الواضحة." };

    const handleWhatsAppShare = () => {
      const title = sourceTitle ? `اختبار "${sourceTitle}"` : "الكويز";
      const currentUrl = typeof window !== "undefined" ? window.location.href : "https://molakhasat.me";
      const message = `جبت ${score} من ${totalQuestions} (${scorePercentage}%) في ${title} على منصة ملخصات 🏆\nجرب اختبر نفسك:\n${currentUrl}`;
      if (typeof window !== "undefined") {
        window.location.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      }
    };

    return (
      <div
        dir="rtl"
        className="rounded-[24px] border border-line bg-surface p-5 sm:p-7 shadow-xl transition-all animate-in fade-in-50 duration-200"
      >
        {/* Results Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-ink">
              نتيجة الكويز
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-line bg-paper text-sm font-bold text-muted hover:border-ink/40 hover:text-ink active:scale-95 transition-all cursor-pointer"
            aria-label="إغلاق الكويز"
          >
            ✕
          </button>
        </div>

        {/* Circular Score Badge & Message */}
        <div className="my-5 flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center">
            <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="var(--line)"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="var(--btn)"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="font-heading text-3xl font-bold text-ink" dir="ltr">
                {scorePercentage}%
              </span>
            </div>
          </div>

          <h4 className="mt-3 font-heading text-xl sm:text-2xl font-bold text-ink">
            <mark className="bg-hi text-ink px-2 py-0.5 rounded-lg ml-1">
              {feedback.mark}
            </mark>
            {feedback.title}
          </h4>
          <p className="mt-1 text-sm font-bold text-ink">
            {score} من {totalQuestions} أسئلة صحيحة
          </p>
          <p className="mt-0.5 text-xs text-muted max-w-sm">
            {feedback.desc}
          </p>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 my-5">
          <div className="rounded-2xl border border-[#14664A]/30 bg-[#D9EFE5] p-3 text-center text-[#14664A]">
            <span className="font-heading block text-2xl font-bold">
              {score}
            </span>
            <span className="text-xs font-bold">
              صحيحة
            </span>
          </div>
          <div className="rounded-2xl border border-hue-tomato-deep/30 bg-hue-tomato-tint p-3 text-center text-hue-tomato-deep">
            <span className="font-heading block text-2xl font-bold">
              {totalQuestions - score}
            </span>
            <span className="text-xs font-bold">
              خاطئة
            </span>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-3 text-center text-ink">
            <span className="font-heading block text-2xl font-bold">
              {totalQuestions}
            </span>
            <span className="text-xs font-semibold text-muted">
              المجموع
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-3 border-t border-line">
          <button
            type="button"
            onClick={handleRestart}
            className="w-full min-h-[50px] rounded-xl bg-btn text-btn-ink font-heading text-sm sm:text-base font-bold shadow-md transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>إعادة الكويز بأسئلة جديدة</span>
            <span>🔄</span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowReview((prev) => !prev)}
              className="min-h-[46px] rounded-xl border border-line bg-paper text-ink font-semibold text-xs sm:text-sm hover:border-ink/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{showReview ? "إخفاء المراجعة" : "مراجعة الإجابات"}</span>
              <span>📋</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="min-h-[46px] rounded-xl border border-line bg-paper text-ink font-semibold text-xs sm:text-sm hover:border-ink/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z" />
                <path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z" />
              </svg>
              <span>شارك نتيجتك على واتساب</span>
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[44px] text-xs sm:text-sm font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
            >
              إنهاء والعودة للمادة
            </button>
          </div>
        </div>

        {/* Detailed Question Review List */}
        {showReview && (
          <div className="mt-6 space-y-4 border-t border-line pt-6 animate-in fade-in-50">
            <h5 className="text-sm font-heading font-bold text-ink">
              مراجعة تفصيلية لجميع الأسئلة:
            </h5>
            <div className="space-y-3">
              {activeQuestions.map((q, qIdx) => {
                const answer = answers.find((a) => a.questionIndex === qIdx);
                const userChoice = answer !== undefined ? answer.selectedIndex : -1;
                const isCorrect = answer?.isCorrect;

                return (
                  <div
                    key={qIdx}
                    className={`rounded-2xl border p-4 text-xs sm:text-sm ${
                      isCorrect
                        ? "border-[#14664A]/30 bg-[#D9EFE5]/40"
                        : "border-[#A8361C]/30 bg-[#F7DDD3]/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span dir="auto" className="font-semibold text-ink block">
                          {qIdx + 1}. {q.question}
                        </span>
                        {q.topic && (
                          <span className="inline-block rounded-lg border border-line bg-paper px-2 py-0.5 text-[11px] text-muted">
                            الموضوع: {q.topic}
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isCorrect
                            ? "bg-[#14664A]/15 text-[#14664A]"
                            : "bg-[#A8361C]/15 text-[#A8361C]"
                        }`}
                      >
                        {isCorrect ? "صحيح ✓" : "خاطئ ✕"}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = userChoice === optIdx;
                        const isRightAnswer = q.correctIndex === optIdx;

                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors ${
                              isRightAnswer
                                ? "bg-[#D9EFE5] font-bold text-[#14664A] border border-[#14664A]/30"
                                : isSelected
                                ? "bg-[#F7DDD3] font-bold text-[#A8361C] border border-[#A8361C]/30"
                                : "text-muted bg-paper/60"
                            }`}
                          >
                            <span>
                              {OPTION_LETTERS[optIdx]}) <span dir="auto">{opt}</span>
                            </span>
                            {isRightAnswer && <span className="font-bold text-[#14664A]">(الإجابة الصحيحة)</span>}
                            {isSelected && !isRightAnswer && <span className="font-bold text-[#A8361C]">(إجابتك)</span>}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="mt-2.5 rounded-xl bg-surface p-3 text-xs text-muted border border-line">
                        <span className="font-bold text-ink inline-block mb-1">💡 التوضيح:</span>
                        <p dir="auto" className="leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── STATE 3: In Progress & Answered (Question Card) ───────────────────────
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div
      dir="rtl"
      className="rounded-3xl border border-line bg-surface p-5 sm:p-7 shadow-sm transition-all animate-in fade-in-50 duration-200"
    >
      {/* Quiz Header: Close Button + Tracker + Score Pill */}
      <div className="space-y-3 pb-4 border-b border-line">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-line text-ink hover:bg-paper transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق الكويز"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="flex-1 text-center">
            <span className="font-heading text-sm sm:text-base font-bold text-ink">
              السؤال {currentIndex + 1} من {totalQuestions}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-hi px-3 py-1.5 text-xs sm:text-sm font-bold text-ink shrink-0">
            <span>النقاط</span>
            <span className="font-mono">{score}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-label="تقدم الكويز"
          aria-valuemin={0}
          aria-valuemax={totalQuestions}
          aria-valuenow={currentIndex + 1}
          className="h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-btn transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Tags Row: Topic & Difficulty */}
      <div className="flex flex-wrap items-center gap-2 pt-3">
        {currentQuestion?.topic && (
          <span className="inline-flex items-center rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-muted">
            {currentQuestion.topic}
          </span>
        )}
        {currentQuestion?.difficulty && (
          <span className="inline-flex items-center rounded-lg bg-hi/30 px-3 py-1 text-xs font-bold text-ink">
            {currentQuestion.difficulty === "easy" ? "سهل" : currentQuestion.difficulty === "hard" ? "صعب" : "متوسط"}
          </span>
        )}
      </div>

      {/* Backfill Notice (if targeted difficulty pool was smaller than requested count) */}
      {sessionData.backfillNotice && currentIndex === 0 && (
        <div className="mt-3 rounded-xl border border-line bg-paper px-3.5 py-2 text-xs text-muted">
          ℹ️ {sessionData.backfillNotice}
        </div>
      )}

      {/* Question Text */}
      <div className="py-4 sm:py-5">
        <h3 dir="auto" className="font-heading text-base sm:text-xl font-bold leading-relaxed text-ink">
          {currentQuestion?.question}
        </h3>
      </div>

      {/* 4 Shuffled Options Grid */}
      <div className="space-y-3">
        {currentQuestion?.options.map((option, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = idx === currentQuestion.correctIndex;

          let optionStyle =
            "border-2 border-line bg-paper text-ink hover:border-btn/40 hover:bg-paper/80 active:scale-[0.99] cursor-pointer";
          let badgeElement = (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/10 text-xs sm:text-sm font-bold text-ink transition-colors">
              {OPTION_LETTERS[idx]}
            </span>
          );
          let subtext = null;

          if (isAnswered) {
            if (isCorrect) {
              optionStyle = "border-2 border-[#14664A] bg-[#D9EFE5] text-ink font-semibold shadow-xs cursor-default";
              badgeElement = (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#14664A] text-paper font-bold">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
              );
              subtext = <span className="text-[12px] font-bold text-[#14664A]">الإجابة الصحيحة</span>;
            } else if (isSelected) {
              optionStyle = "border-2 border-[#A8361C] bg-[#F7DDD3] text-ink font-semibold cursor-default";
              badgeElement = (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A8361C] text-paper font-bold">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </span>
              );
              subtext = <span className="text-[12px] font-bold text-[#A8361C]">إجابتك — غير صحيحة</span>;
            } else {
              optionStyle = "border-2 border-line/50 bg-paper/50 opacity-40 text-muted cursor-default";
              badgeElement = (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-xs sm:text-sm font-bold text-muted">
                  {OPTION_LETTERS[idx]}
                </span>
              );
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelectOption(idx)}
              className={`flex w-full items-center justify-between rounded-2xl p-3.5 sm:p-4 text-start transition-all ${optionStyle}`}
            >
              <div className="flex items-center gap-3">
                {badgeElement}
                <div className="flex flex-col gap-0.5">
                  <span dir="auto" className="text-sm sm:text-base leading-normal">{option}</span>
                  {subtext}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Answer Explanation Callout (Revealed once answered) */}
      {isAnswered && currentQuestion?.explanation && (
        <div className="mt-4 rounded-2xl border border-hi/50 bg-hi/20 p-4 sm:p-5 animate-in fade-in-50 duration-200">
          <div className="flex items-start gap-2.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink mt-0.5">
              <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
            </svg>
            <div className="flex-1 space-y-1">
              <span className="block font-heading text-sm font-bold text-ink">
                توضيح الإجابة:
              </span>
              <p dir="auto" className="text-xs sm:text-sm text-ink/90 leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation (Enabled once answered) */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-line">
        <span className="text-xs text-muted hidden sm:inline">
          {!isAnswered
            ? "اختر الإجابة المناسبة (أو اضغط 1-4 على لوحة المفاتيح)"
            : "اضغط على زر المتابعة أو Enter للمتابعة"}
        </span>

        {isAnswered && (
          <button
            type="button"
            onClick={handleNext}
            className="ms-auto inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-btn px-6 py-2.5 font-heading text-sm sm:text-base font-bold text-btn-ink shadow-sm transition-all hover:bg-btn/90 active:scale-[0.98] animate-in fade-in-50 cursor-pointer"
          >
            <span>
              {currentIndex < totalQuestions - 1 ? "السؤال التالي" : "عرض النتيجة"}
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5m0 0l6-6m-6 6l6 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
