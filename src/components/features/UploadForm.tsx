"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ResourceType } from "@/types/database";

interface Course {
  id: string;
  title: string;
  course_code: string | null;
  department?: { name: string };
}

// Upload pipeline stages shown to the admin
type UploadStage =
  | "idle"
  | "validating"
  | "uploading"
  | "processing"
  | "done"
  | "error";

const STAGE_LABELS: Record<UploadStage, string> = {
  idle: "رفع الملف",
  validating: "جارٍ التحقق من الملف...",
  uploading: "جارٍ رفع الملف... ⬆️",
  processing: "جارٍ المعالجة والحفظ... 🔧",
  done: "تم الرفع بنجاح! ✅",
  error: "حدث خطأ ❌",
};

const RESOURCE_TYPES: { value: ResourceType; label: string; emoji: string }[] =
  [
    { value: "summary", label: "ملخص", emoji: "📄" },
    { value: "past_exam", label: "أسئلة سنوات", emoji: "📝" },
    { value: "guide", label: "دليل دراسي", emoji: "📖" },
  ];

const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function UploadForm() {
  // Form state
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("summary");
  const [generateQuiz, setGenerateQuiz] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // UX state
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResourceId, setSuccessResourceId] = useState<string | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch courses for dropdown on mount
  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCourses(data);
      })
      .catch(() => {
        // Non-fatal: form still works, just no dropdown options
      });
  }, []);

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
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!isDragging) setIsDragging(true);
    },
    [isDragging]
  );

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      validateAndSetFile(e.dataTransfer.files?.[0] ?? null);
    },
    [validateAndSetFile]
  );

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!file || !selectedCourseId || !title.trim()) {
      setErrorMessage("يرجى ملء جميع الحقول الإلزامية واختيار ملف.");
      return;
    }

    setStage("validating");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", selectedCourseId);
      formData.append("title", title.trim());
      formData.append("type", resourceType);
      formData.append("generateQuiz", String(generateQuiz));

      setStage("uploading");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setStage("processing");

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل رفع الملف.");
      }

      setSuccessResourceId(data.resourceId);
      setStage("done");

      // Reset form after success
      setTimeout(() => {
        setFile(null);
        setTitle("");
        setSelectedCourseId("");
        setResourceType("summary");
        setGenerateQuiz(false);
        setStage("idle");
        setSuccessResourceId(null);
      }, 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
      setStage("error");
    }
  };

  const isSubmitting =
    stage === "validating" || stage === "uploading" || stage === "processing";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {/* ── 1. Course Selector ─────────────────────────────────────── */}
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
          <option value="">— اختر المادة —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_code ? `${c.course_code} — ` : ""}
              {c.title}
            </option>
          ))}
          {courses.length === 0 && (
            <option disabled value="">
              جارٍ تحميل المواد...
            </option>
          )}
        </select>
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
          نصيحة: استخدم صيغة &quot;الموضوع | العنوان&quot; للتجميع التلقائي (مثل: &quot;عربي | كويز الوحدة الأولى&quot;).
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
                  ? "border-ring bg-accent/10 text-accent"
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
            يستخدم Gemini لإنشاء أسئلة اختيار من متعدد من محتوى الملف
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
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              generateQuiz ? "translate-x-5" : "translate-x-0"
            }`}
            style={{ transform: generateQuiz ? "translateX(-20px)" : "translateX(0)" }}
          />
        </button>
      </div>
      {generateQuiz && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          ⚠️ الكويز التلقائي تجريبي. يُنصح بمراجعة الأسئلة يدوياً بعد الرفع.
        </p>
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

      {/* ── Success Message ────────────────────────────────────────── */}
      {stage === "done" && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
        >
          ✅ تم رفع الملف بنجاح!
          {successResourceId && (
            <span className="block text-xs text-emerald-400/70 mt-1">
              معرّف المورد: {successResourceId}
            </span>
          )}
        </div>
      )}

      {/* ── Submit Button ──────────────────────────────────────────── */}
      <button
        type="submit"
        id="upload-submit-btn"
        disabled={isSubmitting || stage === "done"}
        className={`w-full rounded-xl py-3 px-6 text-sm font-semibold transition-all duration-300 ${
          stage === "done"
            ? "bg-emerald-500 text-white"
            : isSubmitting
            ? "cursor-not-allowed bg-accent/50 text-white"
            : "bg-accent text-white hover:bg-accent/90 active:scale-[0.98]"
        }`}
      >
        {isSubmitting && (
          <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {STAGE_LABELS[stage]}
      </button>
    </form>
  );
}
