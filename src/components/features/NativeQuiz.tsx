"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type {
  QuizData,
  QuizQuestion,
  QuizSelectionMode,
  RecordAttemptPayload,
} from "@/types/database";

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

/**
 * Returns or generates an anonymous client session UUID stored in localStorage.
 */
function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "guest_ssr";
  const KEY = "molakhasat_guest_uuid";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `guest_${
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2, 11)
    }`;
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // localStorage may fail in private browsing mode
    }
  }
  return id;
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

  // Diagnostics Timing & Beacon Safeguards
  const startTimeRef = useRef<number>(Date.now());
  const hasLoggedAttemptRef = useRef<boolean>(false);

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
  }, [bank, selectedCount, selectedMode]);

  // Option selection
  const handleSelectOption = useCallback(
    (index: number) => {
      if (isAnswered || !currentQuestion) return;

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
    [isAnswered, currentQuestion, currentIndex]
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
  }, [bank, selectedCount, selectedMode]);

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

  // ─── TELEMETRY BEACON: Log completed attempt ──────────────────────────────
  useEffect(() => {
    if (!isFinished || hasLoggedAttemptRef.current || !resourceId || !courseId) return;
    hasLoggedAttemptRef.current = true;

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
  }, [
    isFinished,
    resourceId,
    courseId,
    activeQuestions.length,
    score,
    scorePercentage,
    selectedMode,
    answers,
  ]);

  if (!quizData || bankSize === 0) {
    return null;
  }

  // ─── STATE 1: Closed Trigger Banner ─────────────────────────────────────────
  if (!isOpen) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3.5 sm:p-4 transition-all hover:border-accent/40 hover:bg-accent/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground text-lg shadow-sm">
            🎯
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                كويز تفاعلي لاختبار الفهم
              </span>
              <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                بنك يضم {bankSize} سؤالاً
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {sourceTitle || quizData.sourceTitle || "اختبر معلوماتك فوراً مع تصحيح مباشر وتوضيح للإجابات"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsConfiguring(bankSize > 10);
            if (bankSize <= 10) {
              handleStartSession();
            }
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs sm:text-sm font-medium text-accent-foreground shadow-sm transition-all hover:bg-accent/90 hover:shadow active:scale-95"
        >
          <span>ابدأ الكويز</span>
          <span className="text-xs">🎯</span>
        </button>
      </div>
    );
  }

  // ─── STATE 2: Launcher & Session Customizer Modal ────────────────────────────
  if (isConfiguring) {
    return (
      <div
        dir="rtl"
        className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-lg transition-all animate-in fade-in-50 duration-200"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚙️</span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                تخصيص جلسة الاختبار
              </h3>
              <p className="text-xs text-muted-foreground">
                يتوفر في هذا الملخص بنك غني يضم {bankSize} سؤالاً تفاعلياً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        <div className="my-6 space-y-5">
          {/* Section 1: Question Count Selector */}
          <div className="space-y-2.5">
            <label className="text-xs sm:text-sm font-bold text-foreground block">
              1. عدد الأسئلة المطلوبة:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { count: 5, label: "5 أسئلة", note: "سريع" },
                { count: 10, label: "10 أسئلة ★", note: "الموصى به" },
                { count: 20, label: "20 سؤالاً", note: "مكثف" },
                { count: bankSize, label: `كامل البنك (${bankSize})`, note: "شامل" },
              ]
                .filter((item, idx, arr) => {
                  // Hide counts larger than the total bank size, but always allow full bank
                  if (item.count > bankSize && item.count !== bankSize) return false;
                  // Avoid duplicate chips if bankSize equals 5, 10, or 20
                  return arr.findIndex((x) => x.count === item.count) === idx;
                })
                .map((item) => {
                  const isSelected = selectedCount === item.count;
                  return (
                    <button
                      key={item.count}
                      type="button"
                      onClick={() => setSelectedCount(item.count)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                        isSelected
                          ? "border-accent bg-accent/10 text-accent font-bold shadow-xs"
                          : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
                      }`}
                    >
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        {item.note}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Section 2: Difficulty Mode Selector */}
          <div className="space-y-2.5">
            <label className="text-xs sm:text-sm font-bold text-foreground block">
              2. مستوى الصعوبة:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  mode: "balanced" as QuizSelectionMode,
                  title: "متوازن (مزيج دراسي) ★",
                  desc: "مزيج يضم 40% سهل، 40% متوسط، و20% متقدم",
                },
                {
                  mode: "easy" as QuizSelectionMode,
                  title: "مفاهيم وأساسيات (سهل)",
                  desc: "يركز على التعريفات والنظريات المباشرة",
                },
                {
                  mode: "medium" as QuizSelectionMode,
                  title: "مستوى امتحاني (متوسط)",
                  desc: "تطبيق القوانين وحل المسائل المعيارية",
                },
                {
                  mode: "hard" as QuizSelectionMode,
                  title: "تحدي واستنتاج (متقدم)",
                  desc: "أسئلة مهارات عليا والتركات الامتحانية",
                },
              ].map((item) => {
                const isSelected = selectedMode === item.mode;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => setSelectedMode(item.mode)}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-start transition-all ${
                      isSelected
                        ? "border-accent bg-accent/10 shadow-xs"
                        : "border-border bg-secondary/40 hover:bg-secondary"
                    }`}
                  >
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        isSelected ? "text-accent" : "text-foreground"
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-border px-4 py-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleStartSession}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs sm:text-sm font-semibold text-accent-foreground shadow-sm transition-all hover:bg-accent/90 active:scale-95"
          >
            <span>ابدأ الاختبار الآن</span>
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
        ? { title: "🎉 ممتاز! أداء رائع ومتميز", desc: "أظهرت استيعاباً عميقاً لمحتوى المادة الدراسية." }
        : scorePercentage >= 50
        ? { title: "👍 جيد جداً! محاولة موفقة", desc: "لديك فهم جيد للمفاهيم الأساسية مع إمكانية التحسين." }
        : { title: "📚 بحاجة إلى مزيد من المراجعة", desc: "ننصح بإعادة قراءة الملخص والتركيز على النقاط غير الواضحة." };

    return (
      <div
        dir="rtl"
        className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-lg transition-all animate-in fade-in-50 duration-200"
      >
        {/* Results Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              نتيجة الكويز
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="إغلاق الكويز"
          >
            ✕
          </button>
        </div>

        {/* Circular Score Badge & Message */}
        <div className="my-6 flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center">
            <svg className="h-32 w-32 -rotate-90 transform" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-secondary"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-accent transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-foreground">
                {scorePercentage}%
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {score} من {totalQuestions}
              </span>
            </div>
          </div>

          <h4 className="mt-4 text-lg font-bold text-foreground">
            {feedback.title}
          </h4>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-md">
            {feedback.desc}
          </p>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 my-6">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
            <span className="block text-xl font-bold text-emerald-500">
              {score}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              إجابات صحيحة
            </span>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
            <span className="block text-xl font-bold text-rose-500">
              {totalQuestions - score}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              إجابات خاطئة
            </span>
          </div>
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-center">
            <span className="block text-xl font-bold text-accent">
              {totalQuestions}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              مجموع الأسئلة
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition-all hover:bg-accent/90 active:scale-95"
          >
            <span>إعادة بأسئلة جديدة</span>
            <span>🔄</span>
          </button>

          {bankSize > 10 && (
            <button
              type="button"
              onClick={() => setIsConfiguring(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary/80"
            >
              <span>تغيير الإعدادات</span>
              <span>⚙️</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowReview((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary/80"
          >
            <span>{showReview ? "إخفاء المراجعة" : "مراجعة الأسئلة والإجابات"}</span>
            <span>📋</span>
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>إنهاء</span>
          </button>
        </div>

        {/* Detailed Question Review List */}
        {showReview && (
          <div className="mt-6 space-y-4 border-t border-border pt-6 animate-in fade-in-50">
            <h5 className="text-sm font-bold text-foreground">
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
                    className={`rounded-xl border p-4 text-xs sm:text-sm ${
                      isCorrect
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-rose-500/30 bg-rose-500/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-semibold text-foreground block">
                          {qIdx + 1}. {q.question}
                        </span>
                        {q.topic && (
                          <span className="inline-block rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] text-muted-foreground">
                            الموضوع: {q.topic}
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          isCorrect
                            ? "bg-emerald-500/20 text-emerald-500"
                            : "bg-rose-500/20 text-rose-500"
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
                            className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                              isRightAnswer
                                ? "bg-emerald-500/15 font-semibold text-emerald-600 dark:text-emerald-400"
                                : isSelected
                                ? "bg-rose-500/15 font-semibold text-rose-600 dark:text-rose-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            <span>
                              {OPTION_LETTERS[optIdx]}) {opt}
                            </span>
                            {isRightAnswer && <span>(الإجابة الصحيحة)</span>}
                            {isSelected && !isRightAnswer && <span>(إجابتك)</span>}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <p className="mt-2.5 rounded-lg bg-background/80 p-2 text-xs text-muted-foreground border border-border/50">
                        💡 <strong>التوضيح:</strong> {q.explanation}
                      </p>
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
      className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-lg transition-all animate-in fade-in-50 duration-200"
    >
      {/* Quiz Header: Tracker + Progress Bar + Close */}
      <div className="space-y-3 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent font-mono text-xs font-bold">
              {currentIndex + 1}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-foreground">
                السؤال {currentIndex + 1} من {totalQuestions}
              </span>
              {currentQuestion?.topic && (
                <span className="hidden sm:inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
                  {currentQuestion.topic}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <span>النقاط:</span>
              <strong className="text-accent font-bold">{score}</strong>
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="إغلاق الكويز"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Backfill Notice (if targeted difficulty pool was smaller than requested count) */}
      {sessionData.backfillNotice && currentIndex === 0 && (
        <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 px-3 py-1.5 text-[11px] text-muted-foreground">
          ℹ️ {sessionData.backfillNotice}
        </div>
      )}

      {/* Question Text */}
      <div className="py-5">
        <h3 className="text-base sm:text-lg font-bold leading-relaxed text-foreground">
          {currentQuestion?.question}
        </h3>
      </div>

      {/* 4 Shuffled Options Grid */}
      <div className="space-y-2.5 sm:space-y-3">
        {currentQuestion?.options.map((option, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = idx === currentQuestion.correctIndex;

          let optionStyle =
            "border-border bg-secondary/50 text-foreground hover:border-accent hover:bg-accent/5";
          let badgeStyle = "bg-secondary text-muted-foreground";

          if (isAnswered) {
            if (isCorrect) {
              optionStyle =
                "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs";
              badgeStyle = "bg-emerald-500 text-white font-bold";
            } else if (isSelected) {
              optionStyle =
                "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold";
              badgeStyle = "bg-rose-500 text-white font-bold";
            } else {
              optionStyle = "border-border/50 opacity-40 text-muted-foreground";
              badgeStyle = "bg-secondary/50 text-muted-foreground";
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelectOption(idx)}
              className={`flex w-full items-center justify-between rounded-xl border p-3.5 sm:p-4 text-start text-xs sm:text-sm transition-all ${optionStyle} ${
                !isAnswered ? "cursor-pointer active:scale-[0.99]" : "cursor-default"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${badgeStyle}`}
                >
                  {OPTION_LETTERS[idx]}
                </span>
                <span className="leading-normal">{option}</span>
              </div>

              {/* Status Icons */}
              {isAnswered && (
                <div className="shrink-0 text-base font-bold ps-2">
                  {isCorrect ? (
                    <span className="text-emerald-500 animate-in zoom-in-50">✓</span>
                  ) : isSelected ? (
                    <span className="text-rose-500 animate-in zoom-in-50">✕</span>
                  ) : null}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Answer Explanation Callout (Revealed once answered) */}
      {isAnswered && currentQuestion?.explanation && (
        <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 p-4 animate-in fade-in-50 duration-200">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">💡</span>
            <div className="flex-1 space-y-1">
              <span className="block text-xs font-bold text-foreground">
                توضيح الإجابة:
              </span>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation (Enabled once answered) */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {!isAnswered
            ? "اختر الإجابة المناسبة (أو اضغط 1-4 على لوحة المفاتيح)"
            : "اضغط على زر المتابعة أو Enter للمتابعة"}
        </span>

        {isAnswered && (
          <button
            type="button"
            onClick={handleNext}
            className="ms-auto inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs sm:text-sm font-semibold text-accent-foreground shadow-sm transition-all hover:bg-accent/90 active:scale-95 animate-in fade-in-50"
          >
            <span>
              {currentIndex < totalQuestions - 1 ? "السؤال التالي" : "عرض النتيجة"}
            </span>
            <span>{currentIndex < totalQuestions - 1 ? "⬅" : "🏆"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
