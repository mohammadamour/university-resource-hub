"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { ResourceType, TargetExam } from "@/types/database";

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
  id: "upload" | "process" | "save";
  label: string;
  description: string;
  icon: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { id: "upload", label: "فحص ورفع الملف", description: "التحقق من سلامة ونقل الملف للسحابة", icon: "⬆️" },
  { id: "process", label: "التدقيق والترميز", description: "استخراج البيانات والفحص الأمني", icon: "🔖" },
  { id: "save", label: "الحفظ والاعتماد", description: "تسجيل المورد في قاعدة البيانات", icon: "🚀" },
];

const RESOURCE_TYPES: { value: ResourceType; label: string; emoji: string }[] = [
  { value: "summary", label: "ملخص", emoji: "📄" },
  { value: "past_exam", label: "أسئلة سنوات", emoji: "📝" },
  { value: "guide", label: "دليل دراسي", emoji: "📖" },
];

const TARGET_EXAMS: { value: TargetExam; label: string; emoji: string }[] = [
  { value: "midterm", label: "مادة الميد", emoji: "🎯" },
  { value: "final", label: "مادة الفاينل", emoji: "🏁" },
  { value: "other", label: "شامل / أخرى", emoji: "🌐" },
];

const ACADEMIC_YEARS = [
  "2025/2026",
  "2024/2025",
  "2023/2024",
  "2022/2023",
  "2021/2022",
];

const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadFormProps {
  initialCourses?: UploadCourse[];
  /** Optional auth secret. If provided, uploads are published immediately as admin ('active'). Otherwise submitted as guest ('pending'). */
  adminSecret?: string;
  /** Optional courseId passed via query params (e.g. from empty course funnel) */
  initialCourseId?: string;
  /** Optional title template passed via query params */
  initialTitle?: string;
}

export default function UploadForm({
  initialCourses = [],
  adminSecret,
  initialCourseId = "",
  initialTitle = "",
}: UploadFormProps) {
  // Form state
  const [courses, setCourses] = useState<UploadCourse[]>(initialCourses);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [title, setTitle] = useState(initialTitle);
  const [resourceType, setResourceType] = useState<ResourceType>("summary");
  const [targetExam, setTargetExam] = useState<TargetExam>("midterm");
  const [academicYear, setAcademicYear] = useState<string>("2025/2026");
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);

  // Optional metadata state
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [professorName, setProfessorName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [description, setDescription] = useState("");

  // Eager text extraction state (speculative)
  const [extractedSourceText, setExtractedSourceText] = useState<string | null>(null);
  const [, setExtractionStatus] = useState<"idle" | "extracting" | "done" | "failed">("idle");

  // Progressive UX state
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusLog, setStatusLog] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResourceId, setSuccessResourceId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize initialCourseId and initialTitle when props change
  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    }
  }, [initialCourseId]);

  useEffect(() => {
    if (initialTitle) {
      setTitle(initialTitle);
    }
  }, [initialTitle]);

  // ─── Eager PDF text & metadata extraction ──────────────────────────────────
  // Automatically extracts page count and selectable text as soon as a file is selected.
  useEffect(() => {
    if (!file) {
      setExtractedSourceText(null);
      setPageCount(null);
      setExtractionStatus("idle");
      return;
    }

    let cancelled = false;
    setExtractionStatus("extracting");

    import("@/lib/pipeline/client-pdf-extractor")
      .then(({ extractPdfMetadataAndText }) => extractPdfMetadataAndText(file))
      .then(({ text, pageCount: numPages }) => {
        if (cancelled) return;
        if (numPages) {
          setPageCount(numPages);
        }
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
    setPageCount(null);
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

  // ─── Submission Handling ───────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!file || !selectedCourseId || !title.trim()) {
      setErrorMessage("يرجى ملء جميع الحقول الإلزامية واختيار ملف.");
      return;
    }

    const submittedCourseId = selectedCourseId;
    const submittedTitle = title.trim();
    const submittedType = resourceType;
    const submittedFileSize = file.size;

    const optimisticallyAddResource = (newId: string) => {
      setCourses((prevCourses) =>
        prevCourses.map((c) => {
          if (c.id !== submittedCourseId) return c;
          const existing = c.resources || [];
          if (existing.some((r) => r.id === newId)) return c;
          return {
            ...c,
            resources: [
              ...existing,
              {
                id: newId,
                title: submittedTitle,
                type: submittedType,
                file_size_bytes: submittedFileSize,
              },
            ],
          };
        })
      );
    };

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
      formData.append("targetExam", targetExam);
      formData.append("academicYear", academicYear);

      if (pageCount) {
        formData.append("pageCount", String(pageCount));
      }
      if (extractedSourceText) {
        formData.append("sourceText", extractedSourceText);
      }
      if (professorName.trim()) {
        formData.append("professorName", professorName.trim());
      }
      if (authorName.trim()) {
        formData.append("authorName", authorName.trim());
      }
      if (description.trim()) {
        formData.append("description", description.trim());
      }

      // Step 1: Uploading
      setCurrentStepIndex(0);
      setProgressPercent(30);
      const extractHint = extractedSourceText ? " (النص مُستخرَج مسبقاً ✓)" : "";
      setStatusLog(`جارٍ رفع الملف إلى خوادم التخزين...${extractHint}`);

      const reqHeaders: Record<string, string> = {};
      if (adminSecret) {
        reqHeaders["x-admin-secret"] = adminSecret;
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: reqHeaders,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل رفع الملف.");
      }

      const resourceId = data.resourceId;

      if (adminSecret) {
        // ── Admin Flow: Connect to SSE telemetry stream for live processing ──
        setStatusLog("تم تسجيل الملف، وجارٍ متابعة المعالجة الحية من الخادم...");
        setProgressPercent(40);

        const sseResponse = await fetch(`/api/upload/progress/${resourceId}`, {
          headers: { "x-admin-secret": adminSecret },
        });

        if (
          sseResponse.ok &&
          sseResponse.body &&
          sseResponse.headers.get("content-type")?.includes("text/event-stream")
        ) {
          const reader = sseResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop() || "";

            for (const part of parts) {
              const line = part.trim();
              if (line.startsWith("data: ")) {
                try {
                  const eventData = JSON.parse(line.slice(6));

                  if (eventData.stage === "uploading") {
                    setCurrentStepIndex(0);
                    setProgressPercent(eventData.percent ?? 30);
                    if (eventData.message) setStatusLog(eventData.message);
                  } else if (eventData.stage === "processing") {
                    setCurrentStepIndex(1);
                    setProgressPercent(eventData.percent ?? 65);
                    if (eventData.message) setStatusLog(eventData.message);
                  } else if (eventData.stage === "done") {
                    setCurrentStepIndex(2);
                    setProgressPercent(100);
                    setStatusLog(eventData.message || "اكتملت جميع مراحل المعالجة بنجاح!");
                    const finalId = eventData.resourceId || resourceId;
                    setSuccessResourceId(finalId);
                    optimisticallyAddResource(finalId);
                  } else if (eventData.stage === "error") {
                    throw new Error(eventData.error || eventData.message || "فشل خط معالجة الملف.");
                  }
                } catch (parseErr) {
                  if (parseErr instanceof Error && !parseErr.message.includes("JSON")) {
                    throw parseErr;
                  }
                }
              }
            }
          }
        } else {
          // Fallback if SSE stream could not be established
          setCurrentStepIndex(2);
          setProgressPercent(100);
          setStatusLog("تم نشر المورد بنجاح في المنصة.");
          setSuccessResourceId(resourceId);
          optimisticallyAddResource(resourceId);
        }
      } else {
        // ── Guest Crowdsourcing Flow: Completed into moderation queue ────────
        setCurrentStepIndex(2);
        setProgressPercent(100);
        setStatusLog("تم استلام الملف بنجاح وإرساله للمراجعة! شكراً لمساهمتك القيّمة.");
        setSuccessResourceId(resourceId);
      }

      // Reset form after 5 seconds on success (keep selectedCourseId for rapid batch uploads)
      setTimeout(() => {
        setFile(null);
        setPageCount(null);
        setTitle("");
        setResourceType("summary");
        setTargetExam("midterm");
        setProfessorName("");
        setAuthorName("");
        setDescription("");
        setIsSubmitting(false);
        setCurrentStepIndex(-1);
        setProgressPercent(0);
        setStatusLog("");
        setSuccessResourceId(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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
                {selectedCourse.resources.map((res) => {
                  const isJustAdded = res.id === successResourceId;
                  return (
                    <span
                      key={res.id}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all duration-300 shadow-2xs ${
                        isJustAdded
                          ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 font-semibold ring-1 ring-emerald-500/30 scale-105"
                          : "border-border bg-card text-card-foreground"
                      }`}
                    >
                      <span>
                        {res.type === "summary" && "📄"}
                        {res.type === "quiz" && "❓"}
                        {res.type === "past_exam" && "📝"}
                        {res.type === "guide" && "📖"}
                      </span>
                      <span className="max-w-[200px] truncate">{res.title}</span>
                      {isJustAdded && (
                        <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[10px] text-emerald-300 font-bold">
                          جديد ✨
                        </span>
                      )}
                    </span>
                  );
                })}
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

      {/* ── 3. Resource Type & Target Exam Scope ──────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Resource Type */}
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

        {/* Target Exam Scope */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            نطاق التغطية / الامتحان <span className="text-destructive">*</span>
          </label>
          <div
            role="group"
            aria-label="نطاق التغطية"
            className="grid grid-cols-3 gap-2"
          >
            {TARGET_EXAMS.map(({ value, label, emoji }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTargetExam(value)}
                disabled={isSubmitting}
                aria-pressed={targetExam === value}
                className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-xs font-medium transition-all disabled:opacity-50 ${
                  targetExam === value
                    ? "border-accent bg-accent/15 text-accent font-semibold shadow-2xs"
                    : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-xl">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. Academic Year Dropdown ─────────────────────────────── */}
      <div className="space-y-2">
        <label
          htmlFor="upload-academic-year"
          className="block text-sm font-medium text-foreground"
        >
          السنة الأكاديمية للملخص / الأسئلة <span className="text-destructive">*</span>
        </label>
        <select
          id="upload-academic-year"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground transition-colors focus:border-ring focus:outline-none disabled:opacity-50"
          required
        >
          {ACADEMIC_YEARS.map((year) => (
            <option key={year} value={year}>
              {year === "2025/2026" ? `${year} (العام الحالي)` : year}
            </option>
          ))}
        </select>
      </div>

      {/* ── 5. File Dropzone ───────────────────────────────────────── */}
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
              <span className="text-sm font-medium text-foreground max-w-[80%] truncate">
                {file.name}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                {pageCount !== null && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-2 py-0.5 text-accent font-semibold">
                      📑 {pageCount} {pageCount === 1 ? "صفحة" : pageCount === 2 ? "صفحتان" : pageCount <= 10 ? "صفحات" : "صفحة"}
                    </span>
                  </>
                )}
              </div>
              {!isSubmitting && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPageCount(null);
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

      {/* ── 6. Collapsible Optional Details ───────────────────────── */}
      <div className="rounded-xl border border-border/80 bg-secondary/30 transition-all overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOptionalFields((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>⚙️</span>
            <span>تفاصيل وخيارات إضافية (اختياري)</span>
            {(professorName || authorName || description) && (
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            )}
          </span>
          <span
            className="text-sm transition-transform duration-200"
            style={{ transform: showOptionalFields ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▾
          </span>
        </button>

        {showOptionalFields && (
          <div className="space-y-4 border-t border-border/50 p-4 animate-in fade-in-50 duration-150">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="upload-professor" className="block text-xs font-medium text-foreground">
                  اسم المدرس / الدكتور
                </label>
                <input
                  id="upload-professor"
                  type="text"
                  value={professorName}
                  onChange={(e) => setProfessorName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="مثال: د. أحمد المحاسنة"
                  className="w-full rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="upload-author" className="block text-xs font-medium text-foreground">
                  {adminSecret ? "اسم الناشر / المُعِد" : "اسمك أو لقبك (المُعِد / المساهم)"}
                </label>
                <input
                  id="upload-author"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={adminSecret ? "افتراضي: Mohammad Al-Amour" : "مثال: إعداد الطالب / دفعة 2023"}
                  className="w-full rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="upload-description" className="block text-xs font-medium text-foreground">
                ملاحظات أو وصف إضافي
              </label>
              <textarea
                id="upload-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="مثال: يغطي الوحدات 1 حتى 3 مع أسئلة المقترحة وشرح القوانين..."
                className="w-full rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none disabled:opacity-50 resize-none"
              />
            </div>
          </div>
        )}
      </div>

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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PIPELINE_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-xs transition-all ${
                    isPast || isCompleted
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                      : isCurrent
                      ? "border-accent bg-accent/10 text-accent font-semibold shadow-xs"
                      : "border-border/60 bg-secondary/40 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span>{isPast || isCompleted ? "✅" : step.icon}</span>
                    <span className="font-medium truncate">{step.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {step.description}
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
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-emerald-400 space-y-1.5 animate-in fade-in-50"
        >
          <div className="flex items-center gap-2 font-semibold text-base">
            <span>{adminSecret ? "✅ تم رفع ونشر المورد بنجاح!" : "🎉 شكراً جزيلاً لمساهمتك القيمة!"}</span>
          </div>
          <p className="text-xs text-emerald-400/90 leading-relaxed">
            {adminSecret
              ? "أصبح المورد الآن متاحاً فورياً لطلاب المادة على المنصة."
              : "تم استلام الملف بنجاح! سيتم تدقيقه ونشره قريباً من قِبل إدارة المنصة ليظهر لجميع زملائك الطلبة."}
          </p>
          {successResourceId && (
            <span className="block font-mono text-[11px] text-emerald-400/60 mt-1">
              رقم المرجع: {successResourceId}
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
          adminSecret ? "تم النشر بنجاح! ✅" : "تم الإرسال للمراجعة! ✅"
        ) : (
          adminSecret ? "بدء المعالجة والنشر 🚀" : "إرسال المورد للمراجعة 📤"
        )}
      </button>
    </form>
  );
}
