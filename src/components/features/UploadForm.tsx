"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { ResourceType } from "@/types/database";

export interface CourseResourceSummary {
  id: string;
  title: string;
  type: ResourceType;
  file_size_bytes?: number | null;
}

export interface UploadCourse {
  id: string;
  title: string;
  course_code: string | null;
  department?: { name: string } | null;
  resources?: CourseResourceSummary[];
}

export interface PipelineStep {
  id: "upload" | "process" | "quiz" | "save";
  label: string;
  description: string;
  icon: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { id: "upload", label: "الرفع والتخزين", description: "نقل الملف إلى السحابة", icon: "⬆️" },
  { id: "process", label: "الضغط والتنقية", description: "تقليص الحجم لـ 150 DPI", icon: "🔧" },
  { id: "quiz", label: "الكويز التفاعلي", description: "تحليل وتوليد الأسئلة بـ Gemini", icon: "✨" },
  { id: "save", label: "الحفظ والنشر", description: "اعتماد المورد وإتاحته للطلاب", icon: "🚀" },
];

const RESOURCE_TYPES: { value: ResourceType; label: string; emoji: string }[] = [
  { value: "summary", label: "ملخص", emoji: "📄" },
  { value: "past_exam", label: "أسئلة سنوات", emoji: "📝" },
  { value: "guide", label: "دليل دراسي", emoji: "📖" },
];

const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadFormProps {
  initialCourses?: UploadCourse[];
  /** Passed from the server-rendered page (already validated). Used as API auth header. */
  adminSecret: string;
}

export default function UploadForm({ initialCourses = [], adminSecret }: UploadFormProps) {
  // Form state
  const [courses, setCourses] = useState<UploadCourse[]>(initialCourses);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("summary");
  const [generateQuiz, setGenerateQuiz] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Eager text extraction state (speculative: runs as soon as file + quiz toggle are set)
  const [extractedSourceText, setExtractedSourceText] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<"idle" | "extracting" | "done" | "failed">("idle");

  // Progressive UX state
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusLog, setStatusLog] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResourceId, setSuccessResourceId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Eager PDF text extraction (speculative) ───────────────────────────────
  // Fires as soon as a valid PDF file is selected.
  // Result is held in `extractedSourceText` and attached to FormData on submit if generateQuiz is true.
  // This means by the time the user types the title or toggles quiz, text is already ready —
  // eliminating any waiting time for client-side extraction.
  useEffect(() => {
    if (!file) {
      setExtractedSourceText(null);
      setExtractionStatus("idle");
      return;
    }

    let cancelled = false;
    setExtractionStatus("extracting");

    import("@/lib/pipeline/client-pdf-extractor")
      .then(({ extractTextFromPdf }) => extractTextFromPdf(file))
      .then((text) => {
        if (cancelled) return;
        if (text) {
          setExtractedSourceText(text);
          setExtractionStatus("done");
        } else {
          // Scanned image PDF — server will handle it with pdf-parse fallback
          setExtractionStatus("failed");
        }
      })
      .catch(() => {
        if (!cancelled) setExtractionStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  // If initialCourses was empty, try fetching client-side as fallback
  useEffect(() => {
    if (courses.length === 0) {
      fetch("/api/courses")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setCourses(data);
        })
        .catch(() => {
          // Non-fatal
        });
    }
  }, [courses.length]);

  // Selected course details for optimistic preview
  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId),
    [courses, selectedCourseId]
  );

  // ─── File Handling ─────────────────────────────────────────────────────────

  const validateAndSetFile = useCallback((incoming: File | null) => {
    if (!incoming) return;
    setErrorMessage(null);

    if (incoming.type !== "application/pdf") {
      setErrorMessage("الملف يجب أن يكون بصيغة PDF فقط.");
      return;
    }
    if (incoming.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `حجم الملف يتجاوز الحد المسموح (${MAX_FILE_SIZE_MB} ميغابايت).`
      );
      return;
    }
    setFile(incoming);
    // Reset extraction when a new file is chosen
    setExtractedSourceText(null);
    setExtractionStatus("idle");
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      validateAndSetFile(e.dataTransfer.files?.[0] ?? null);
    },
    [validateAndSetFile]
  );

  // ─── Progressive Submission (SSE & Stream Capable) ─────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!file || !selectedCourseId || !title.trim()) {
      setErrorMessage("يرجى ملء جميع الحقول الإلزامية واختيار ملف.");
      return;
    }

    setIsSubmitting(true);
    setCurrentStepIndex(0);
    setProgressPercent(15);
    setStatusLog("جارٍ تجهيز الملف وفحص البيانات...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", selectedCourseId);
      formData.append("title", title.trim());
      formData.append("type", resourceType);
      formData.append("generateQuiz", String(generateQuiz));

      // Attach eagerly-extracted text if available — server skips its own extraction
      if (generateQuiz && extractedSourceText) {
        formData.append("sourceText", extractedSourceText);
      }

      // Update to Step 1 (Upload)
      setCurrentStepIndex(0);
      setProgressPercent(30);
      const extractHint =
        generateQuiz && extractedSourceText
          ? " (النص مُستخرَج مسبقاً ✓)"
          : "";
      setStatusLog(`جارٍ رفع الملف إلى خوادم التخزين...${extractHint}`);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "x-admin-secret": adminSecret },
        body: formData,
      });

      // Handle streaming responses (SSE or newline-delimited events)
      if (
        response.body &&
        response.headers.get("content-type")?.includes("text/event-stream")
      ) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.stage === "uploading") {
                  setCurrentStepIndex(0);
                  setProgressPercent(35);
                  if (data.message) setStatusLog(data.message);
                } else if (data.stage === "processing") {
                  setCurrentStepIndex(1);
                  setProgressPercent(55);
                  if (data.message) setStatusLog(data.message);
                } else if (data.stage === "synthesizing") {
                  setCurrentStepIndex(2);
                  setProgressPercent(80);
                  if (data.message) setStatusLog(data.message);
                } else if (data.stage === "done") {
                  setCurrentStepIndex(3);
                  setProgressPercent(100);
                  setStatusLog(data.message || "اكتملت جميع مراحل المعالجة بنجاح!");
                  setSuccessResourceId(data.resourceId || "saved");
                } else if (data.stage === "error") {
                  throw new Error(data.error || "فشل خط معالجة الملف.");
                }
              } catch (parseErr) {
                if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
                  throw parseErr;
                }
              }
            }
          }
        }
      } else {
        // Fallback for standard JSON API response
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "فشل رفع الملف.");
        }

        // Simulate progressive pipeline steps smoothly if non-streamed
        setCurrentStepIndex(1);
        setProgressPercent(60);
        setStatusLog("تم ضغط وتنقية المستند...");

        if (generateQuiz) {
          setCurrentStepIndex(2);
          setProgressPercent(85);
          setStatusLog("تم توليد الكويز التفاعلي بـ Gemini...");
        }

        setCurrentStepIndex(3);
        setProgressPercent(100);
        setStatusLog("تم نشر المورد بنجاح في قاعدة البيانات!");
        setSuccessResourceId(data.resourceId || "success");
      }

      // Reset form after 5 seconds on success
      setTimeout(() => {
        setFile(null);
        setTitle("");
        setSelectedCourseId("");
        setResourceType("summary");
        setGenerateQuiz(false);
        setIsSubmitting(false);
        setCurrentStepIndex(-1);
        setProgressPercent(0);
        setStatusLog("");
        setSuccessResourceId(null);
      }, 5000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء الرفع.");
      setIsSubmitting(false);
      setCurrentStepIndex(-1);
      setProgressPercent(0);
      setStatusLog("");
    }
  };

  const isCompleted = progressPercent === 100;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {/* ── 1. Course Selector & Optimistic Context ────────────────── */}
      <div className="space-y-2">
        <label
          htmlFor="upload-course"
          className="block text-sm font-medium text-foreground"
        >
          المادة الدراسية <span className="text-destructive">*</span>
        </label>
        <select
          id="upload-course"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground transition-colors focus:border-ring focus:outline-none disabled:opacity-50"
          required
        >
          <option value="">— اختر المادة من القائمة —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_code ? `${c.course_code} — ` : ""}
              {c.title}
            </option>
          ))}
          {courses.length === 0 && (
            <option disabled value="">
              جارٍ تحميل المواد من قاعدة البيانات...
            </option>
          )}
        </select>

        {/* Optimistic Course Context Preview */}
        {selectedCourse && (
          <div className="mt-3 rounded-xl border border-border/80 bg-secondary/60 p-3.5 transition-all animate-in fade-in-50">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium text-foreground">
                📚 المحتوى المتاح حالياً لهذه المادة:
              </span>
              <span>
                {selectedCourse.resources && selectedCourse.resources.length > 0
                  ? `${selectedCourse.resources.length} موارد متوفرة`
                  : "لا توجد موارد بعد (سيكون هذا أول مورد!)"}
              </span>
            </div>

            {selectedCourse.resources && selectedCourse.resources.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedCourse.resources.map((res) => (
                  <span
                    key={res.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-card-foreground shadow-2xs"
                  >
                    <span>
                      {res.type === "summary" && "📄"}
                      {res.type === "quiz" && "❓"}
                      {res.type === "past_exam" && "📝"}
                      {res.type === "guide" && "📖"}
                    </span>
                    <span className="max-w-[200px] truncate">{res.title}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/80">
                هذه المادة بحاجة إلى محتوى أساسي لتظهر نشطة للطلاب في الكلية.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── 2. Resource Title ─────────────────────────────────────── */}
      <div className="space-y-2">
        <label
          htmlFor="upload-title"
          className="block text-sm font-medium text-foreground"
        >
          عنوان المورد <span className="text-destructive">*</span>
        </label>
        <input
          id="upload-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          placeholder="مثال: ملخص الوحدة الأولى — مقدمة في الخوارزميات"
          className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none disabled:opacity-50"
          required
        />
        <p className="text-xs text-muted-foreground">
          نصيحة: استخدم صيغة &quot;الموضوع | العنوان&quot; للتجميع التلقائي (مثل: &quot;تفاضل 1 | ملخص النهايات والاتصال&quot;).
        </p>
      </div>

      {/* ── 3. Resource Type ───────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          نوع المورد <span className="text-destructive">*</span>
        </label>
        <div
          role="group"
          aria-label="نوع المورد"
          className="grid grid-cols-3 gap-2"
        >
          {RESOURCE_TYPES.map(({ value, label, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => setResourceType(value)}
              disabled={isSubmitting}
              aria-pressed={resourceType === value}
              className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-xs font-medium transition-all disabled:opacity-50 ${
                resourceType === value
                  ? "border-ring bg-accent/10 text-accent font-semibold shadow-2xs"
                  : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xl">{emoji}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. File Dropzone ───────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          ملف PDF <span className="text-destructive">*</span>
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isSubmitting && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            e.key === "Enter" && !isSubmitting && fileInputRef.current?.click()
          }
          aria-label="منطقة رفع الملف"
          className={`relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all ${
            isSubmitting
              ? "cursor-not-allowed opacity-50"
              : isDragging
              ? "border-accent bg-accent/5 scale-[1.01]"
              : file
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-border bg-secondary/50 hover:border-muted-foreground hover:bg-secondary"
          }`}
        >
          {file ? (
            <>
              <span className="text-2xl">📄</span>
              <span className="text-sm font-medium text-foreground">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              {!isSubmitting && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="absolute top-2 left-2 rounded-full p-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="إزالة الملف"
                >
                  ✕
                </button>
              )}
            </>
          ) : (
            <>
              <span className="text-3xl">{isDragging ? "⬇️" : "☁️"}</span>
              <span className="text-sm font-medium text-foreground">
                {isDragging ? "أفلت الملف هنا" : "اسحب وأفلت ملف PDF"}
              </span>
              <span className="text-xs text-muted-foreground">
                أو انقر للتصفح — الحد الأقصى {MAX_FILE_SIZE_MB} ميغابايت
              </span>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
          disabled={isSubmitting}
          aria-hidden="true"
        />
      </div>

      {/* ── 5. AI Quiz Toggle ──────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">
            توليد كويز تفاعلي بالذكاء الاصطناعي ✨
          </span>
          <span className="text-xs text-muted-foreground">
            {generateQuiz
              ? extractionStatus === "extracting"
                ? "⏳ جارٍ استخراج النص من الـ PDF..."
                : extractionStatus === "done"
                ? "✅ تم استخراج النص مسبقاً — سيكون الرفع أسرع"
                : extractionStatus === "failed"
                ? "⚠️ PDF مسحوب ضوئياً — سيتم الاستخراج على الخادم"
                : "يستخدم Gemini لصياغة أسئلة اختيار من متعدد مستخلصة من الشرح"
              : extractionStatus === "done"
              ? "✨ النص مستخرج وجاهز إذا أردت تفعيل الكويز"
              : "يستخدم Gemini لصياغة أسئلة اختيار من متعدد مستخلصة من الشرح"}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={generateQuiz}
          id="upload-generate-quiz"
          onClick={() => setGenerateQuiz((prev) => !prev)}
          disabled={isSubmitting}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
            generateQuiz ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200`}
            style={{
              transform: generateQuiz ? "translateX(-20px)" : "translateX(0)",
            }}
          />
        </button>
      </div>

      {generateQuiz && extractionStatus !== "extracting" && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          ⚠️ الكويز التلقائي تجريبي. سيقوم النظام باستخراج النص وإرساله إلى Gemini لإنشاء الأسئلة.
        </p>
      )}

      {/* ── Progressive Pipeline Progress Stepper ──────────────────── */}
      {isSubmitting && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-accent animate-ping" />
              مراحل خط المعالجة (Pipeline)
            </span>
            <span className="font-mono text-accent font-medium">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Track */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stepper Pills */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PIPELINE_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isFuture = idx > currentStepIndex;
              const isSkippedQuiz = step.id === "quiz" && !generateQuiz;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-xs transition-all ${
                    isPast || (isCompleted && !isSkippedQuiz)
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                      : isCurrent
                      ? "border-accent bg-accent/10 text-accent font-semibold shadow-xs"
                      : isSkippedQuiz
                      ? "border-border/40 bg-secondary/30 text-muted-foreground/60"
                      : "border-border/60 bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span>{isPast || isCompleted ? "✅" : step.icon}</span>
                    <span className="font-medium truncate">{step.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {isSkippedQuiz ? "تم التخطي (معطل)" : step.description}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Live Status Message */}
          {statusLog && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary/80 px-3 py-2 text-xs font-mono text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span>{statusLog}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Error Message ──────────────────────────────────────────── */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      {/* ── Success Banner ─────────────────────────────────────────── */}
      {isCompleted && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 space-y-1"
        >
          <div className="font-semibold">✅ تم رفع ومعالجة الملف بنجاح!</div>
          <p className="text-xs text-emerald-400/80">
            أصبح المورد الآن متاحاً فورياً لطلاب المادة على المنصة.
          </p>
          {successResourceId && (
            <span className="block font-mono text-[11px] text-emerald-400/60 mt-1">
              معرّف المورد: {successResourceId}
            </span>
          )}
        </div>
      )}

      {/* ── Submit Button ──────────────────────────────────────────── */}
      <button
        type="submit"
        id="upload-submit-btn"
        disabled={isSubmitting || isCompleted}
        className={`w-full rounded-xl py-3 px-6 text-sm font-semibold transition-all duration-300 ${
          isCompleted
            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
            : isSubmitting
            ? "cursor-not-allowed bg-accent/60 text-white"
            : "bg-accent text-white hover:bg-accent/90 active:scale-[0.98] shadow-md shadow-accent/20"
        }`}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>جارٍ معالجة المستند...</span>
          </span>
        ) : isCompleted ? (
          "تم النشر بنجاح! ✅"
        ) : (
          "بدء المعالجة والرفع 🚀"
        )}
      </button>
    </form>
  );
}
