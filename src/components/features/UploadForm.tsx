"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";
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
  slug?: string;
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
  { value: "summary", label: "ملخص دراسي", emoji: "📄" },
  { value: "past_exam", label: "أسئلة سنوات وتجميعات", emoji: "📝" },
  { value: "guide", label: "دليل دراسي / خطة المادة", emoji: "📖" },
  { value: "link", label: "رابط خارجي / مرجع", emoji: "🔗" },
  { value: "other", label: "أخرى / سلايدات إضافية", emoji: "📁" },
];

const TARGET_EXAMS: { value: TargetExam; label: string; emoji: string; hint: string }[] = [
  { value: "midterm", label: "مادة الميد (Midterm)", emoji: "🎯", hint: "امتحانات منتصف الفصل والوحدات الأولى" },
  { value: "final", label: "مادة الفاينل (Final)", emoji: "🏁", hint: "شامل لمنهج نهاية الفصل الدراسي" },
  { value: "other", label: "شامل / أخرى", emoji: "🌐", hint: "مادة تكميلية، مراجعة عامة أو أسئلة متفرقة" },
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
const MAX_SOURCE_TEXT_CHARS = 100_000;

async function parseApiResponse<T extends { error?: string }>(
  response: Response,
  fallbackError: string
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = (await response.json()) as T;
    if (!response.ok) {
      throw new Error(data.error ?? fallbackError);
    }
    return data;
  }

  const bodyText = await response.text().catch(() => "");
  if (response.status === 413) {
    throw new Error(
      "حجم البيانات المرسلة تجاوز الحد المسموح للخادم — يرجى المحاولة مرة أخرى أو تقليل حجم الملف."
    );
  }
  throw new Error(
    `خطأ في الخادم (${response.status}): ${bodyText.slice(0, 120) || fallbackError}`
  );
}

async function hasClientPdfSignature(file: File): Promise<boolean> {
  try {
    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    return new TextDecoder("ascii").decode(header) === "%PDF-";
  } catch {
    return true; // Let server verify authoritatively if slice fails
  }
}

async function computeClientSha256(file: File): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    // Plain HTTP on LAN IPs disables crypto.subtle; server will hash after upload
    return null;
  }
  try {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

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
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [linkUrl, setLinkUrl] = useState<string>("");
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
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [, setExtractionStatus] = useState<"idle" | "extracting" | "done" | "failed">("idle");

  // Progressive UX state
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusLog, setStatusLog] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResourceId, setSuccessResourceId] = useState<string | null>(null);
  const [existingOpen, setExistingOpen] = useState(true);

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
      setThumbnailBlob(null);
      setPageCount(null);
      setExtractionStatus("idle");
      return;
    }

    let cancelled = false;
    setExtractionStatus("extracting");

    import("@/lib/pipeline/client-pdf-extractor")
      .then(({ extractPdfMetadataAndText }) => extractPdfMetadataAndText(file))
      .then(({ text, pageCount: numPages, thumbnailBlob: thumb }) => {
        if (cancelled) return;
        if (thumb) {
          setThumbnailBlob(thumb);
        }
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

  // Group courses by department for fast, organized selection
  const groupedCourses = useMemo(() => {
    const map = new Map<string, UploadCourse[]>();
    courses.forEach((c) => {
      const deptName = c.department?.name || "مواد عامة";
      if (!map.has(deptName)) {
        map.set(deptName, []);
      }
      map.get(deptName)!.push(c);
    });
    return Array.from(map.entries());
  }, [courses]);

  // Smart preset coupling: auto-select target_exam based on resource type
  const handleResourceTypeChange = useCallback(
    (newType: ResourceType) => {
      setResourceType(newType);
      if (newType === "guide" || newType === "link" || newType === "other") {
        setTargetExam("other");
      } else if (newType === "summary" || newType === "past_exam") {
        if (targetExam === "other") {
          setTargetExam("midterm");
        }
      }
    },
    [targetExam]
  );

  // Reusable helper to reset form fields after submission while preserving selectedCourseId
  const resetFormState = useCallback(() => {
    setFile(null);
    setThumbnailBlob(null);
    setLinkUrl("");
    setPageCount(null);
    setTitle("");
    setResourceType("summary");
    setTargetExam("midterm");
    setIsFeatured(false);
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

    const isLinkResource = resourceType === "link";

    if (isLinkResource) {
      if (!linkUrl.trim() || !selectedCourseId || !title.trim()) {
        setErrorMessage("يرجى ملء جميع الحقول الإلزامية وإدخال الرابط الخارجي.");
        return;
      }
      if (!linkUrl.startsWith("http://") && !linkUrl.startsWith("https://")) {
        setErrorMessage("يرجى إدخال رابط صحيح يبدأ بـ https:// أو http://");
        return;
      }
    } else {
      if (!file || !selectedCourseId || !title.trim()) {
        setErrorMessage("يرجى ملء جميع الحقول الإلزامية واختيار ملف PDF.");
        return;
      }
    }

    const submittedCourseId = selectedCourseId;
    const submittedTitle = title.trim();
    const submittedType = resourceType;
    const submittedFileSize = file ? file.size : null;

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
    setStatusLog(
      isLinkResource
        ? "جارٍ التحقق من الرابط الخارجي..."
        : "جارٍ تجهيز الملف وفحص البيانات..."
    );

    try {
      const reqHeaders: Record<string, string> = {};
      if (adminSecret) {
        reqHeaders["x-admin-secret"] = adminSecret;
      }

      let resourceId = "";

      if (isLinkResource) {
        const formData = new FormData();
        formData.append("linkUrl", linkUrl.trim());
        formData.append("courseId", selectedCourseId);
        formData.append("title", title.trim());
        formData.append("type", resourceType);
        formData.append("targetExam", targetExam);
        formData.append("academicYear", academicYear);
        formData.append("isFeatured", String(isFeatured));
        if (professorName.trim()) {
          formData.append("professorName", professorName.trim());
        }
        if (authorName.trim()) {
          formData.append("authorName", authorName.trim());
        }
        if (description.trim()) {
          formData.append("description", description.trim());
        }

        setCurrentStepIndex(0);
        setProgressPercent(30);
        setStatusLog("جارٍ تسجيل الرابط في قاعدة البيانات...");

        const response = await fetch("/api/upload", {
          method: "POST",
          headers: reqHeaders,
          body: formData,
        });

        const data = await parseApiResponse<{ resourceId?: string; error?: string }>(
          response,
          "فشل حفظ الرابط."
        );
        resourceId = typeof data.resourceId === "string" ? data.resourceId : "";
      } else if (file) {
        // ── Direct-to-Storage PDF Flow (bypasses Vercel's 4.5 MB serverless body cap) ──
        if (!(await hasClientPdfSignature(file))) {
          throw new Error("الملف المختار ليس مستند PDF صالحاً (%PDF- غير موجود).");
        }

        const fileHash = await computeClientSha256(file);

        // Step 1: Mint signed Storage upload URL + pre-check SHA-256 duplicates (<1 KB JSON)
        setCurrentStepIndex(0);
        setProgressPercent(20);
        setStatusLog("جارٍ فحص التكرار وتجهيز قناة الرفع المباشر...");

        const initResponse = await fetch("/api/upload/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: selectedCourseId,
            title: title.trim(),
            type: resourceType,
            fileSize: file.size,
            mimeType: file.type,
            fileHash,
            hasThumbnail: Boolean(thumbnailBlob),
          }),
        });

        const initData = await parseApiResponse<{
          resourceId: string;
          filePath: string;
          pdfUploadToken: string;
          thumbPath: string | null;
          thumbUploadToken: string | null;
          error?: string;
        }>(initResponse, "تعذر تجهيز رابط الرفع المباشر.");

        // Step 2: Upload PDF binary directly to Supabase Storage (supports up to 30 MB)
        setProgressPercent(30);
        const extractHint = extractedSourceText ? " (النص مُستخرَج مسبقاً ✓)" : "";
        setStatusLog(`جارٍ رفع الملف مباشرة إلى التخزين السحابي...${extractHint}`);

        const supabaseBrowser = createSupabaseBrowserClient();
        const { error: pdfStorageError } = await supabaseBrowser.storage
          .from("resources")
          .uploadToSignedUrl(initData.filePath, initData.pdfUploadToken, file, {
            contentType: "application/pdf",
            cacheControl: "31536000",
          });

        if (pdfStorageError) {
          throw new Error(
            `فشل رفع الملف إلى التخزين السحابي: ${pdfStorageError.message}`
          );
        }

        let uploadedThumbnail = false;
        if (thumbnailBlob && initData.thumbPath && initData.thumbUploadToken) {
          const { error: thumbStorageError } = await supabaseBrowser.storage
            .from("resources")
            .uploadToSignedUrl(
              initData.thumbPath,
              initData.thumbUploadToken,
              thumbnailBlob,
              {
                contentType: "image/jpeg",
                cacheControl: "31536000",
              }
            );
          uploadedThumbnail = !thumbStorageError;
        }

        // Step 3: Notify /api/upload with lightweight JSON metadata to verify, watermark & publish
        setProgressPercent(45);
        setStatusLog("تم نقل الملف بنجاح، وجارٍ التحقق النهائي وتضمين العلامة المرجعية...");

        const truncatedText =
          extractedSourceText && extractedSourceText.length > MAX_SOURCE_TEXT_CHARS
            ? extractedSourceText.slice(0, MAX_SOURCE_TEXT_CHARS)
            : extractedSourceText;

        const finalizeResponse = await fetch("/api/upload", {
          method: "POST",
          headers: {
            ...reqHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resourceId: initData.resourceId,
            courseId: selectedCourseId,
            title: title.trim(),
            type: resourceType,
            targetExam,
            academicYear,
            pageCount,
            sourceText: truncatedText,
            professorName: professorName.trim() || null,
            authorName: authorName.trim() || null,
            description: description.trim() || null,
            hasThumbnail: uploadedThumbnail,
          }),
        });

        const finalizeData = await parseApiResponse<{
          resourceId?: string;
          error?: string;
        }>(finalizeResponse, "فشل تسجيل الملف بعد الرفع.");

        resourceId =
          typeof finalizeData.resourceId === "string"
            ? finalizeData.resourceId
            : initData.resourceId;
      }

      if (isLinkResource) {
        // Immediate completion for links (no background processing needed)
        setCurrentStepIndex(2);
        setProgressPercent(100);
        setStatusLog(
          adminSecret
            ? "تم نشر الرابط الخارجي بنجاح في المنصة!"
            : "تم استلام الرابط بنجاح وإرساله للمراجعة! شكراً لمساهمتك القيّمة."
        );
        setSuccessResourceId(resourceId);
        optimisticallyAddResource(resourceId);

        if (adminSecret) {
          setTimeout(() => {
            resetFormState();
          }, 4000);
        } else {
          setIsSubmitting(false);
        }
        return;
      }

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

      // Reset behavior: Admin auto-resets after 5s for rapid batches; Guest state remains frozen for reading
      if (adminSecret) {
        setTimeout(() => {
          resetFormState();
        }, 5000);
      } else {
        // Release submitting lock so guest can read appreciation notice and reference ID
        setIsSubmitting(false);
      }
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
      {/* ── 1. Course Selector & Duplicate Defense ────────────────── */}
      <div className="space-y-2">
        <label
          htmlFor="upload-course"
          className="block text-sm font-bold text-ink"
        >
          المادة الدراسية <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <select
            id="upload-course"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            disabled={isSubmitting}
            className="w-full min-h-[52px] appearance-none rounded-[14px] border border-line bg-paper px-4 py-2.5 pe-10 text-base text-ink transition-colors focus:border-ink/60 focus:outline-none disabled:opacity-50"
            required
          >
            <option value="">— اختر المادة من القائمة ({courses.length} مادة متاحة) —</option>
            {groupedCourses.map(([deptName, deptCourses]) => (
              <optgroup key={deptName} label={deptName}>
                {deptCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code ? `${c.course_code} — ` : ""}
                    {c.title}
                  </option>
                ))}
              </optgroup>
            ))}
            {courses.length === 0 && (
              <option disabled value="">
                جارٍ تحميل المواد من قاعدة البيانات...
              </option>
            )}
          </select>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 inset-inline-end-3 text-muted"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {/* Existing Content Accordion (Duplicate Defense) */}
        {selectedCourse && (
          <div className="mt-2.5 rounded-2xl border border-line bg-paper/60 overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setExistingOpen((prev) => !prev)}
              className="flex w-full min-h-[48px] items-center justify-between gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-ink hover:bg-ink/[0.02] cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="text-base">📑</span>
                <span>
                  {selectedCourse.resources && selectedCourse.resources.length > 0
                    ? `${selectedCourse.resources.length} ملفات متوفرة لهذه المادة`
                    : "لا توجد ملفات متوفرة بعد (سيكون ملفك الأول لهذه المادة!)"}
                </span>
              </span>
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted transition-transform duration-200"
                style={{ transform: existingOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {existingOpen && (
              <div className="border-t border-line/60 px-3.5 pb-3.5 pt-2.5 space-y-2">
                {selectedCourse.resources && selectedCourse.resources.length > 0 ? (
                  <>
                    <p className="text-xs text-muted leading-relaxed">
                      تأكد أن ملفك غير مكرر قبل الرفع لتعم الفائدة للجميع:
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {selectedCourse.resources.map((res) => {
                        const isJustAdded = res.id === successResourceId;
                        return (
                          <span
                            key={res.id}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                              isJustAdded
                                ? "border-emerald-600/60 bg-[#D9EFE5] text-[#14664A] font-bold"
                                : "border-line bg-surface text-ink shadow-2xs"
                            }`}
                          >
                            <span>
                              {res.type === "summary" && "📄"}
                              {res.type === "quiz" && "❓"}
                              {res.type === "past_exam" && "📝"}
                              {res.type === "guide" && "📖"}
                              {res.type === "link" && "🔗"}
                              {res.type === "other" && "📁"}
                            </span>
                            <span dir="auto" className="max-w-[200px] truncate">
                              {res.title}
                            </span>
                            {isJustAdded && (
                              <span className="rounded bg-emerald-600/20 px-1 py-0.2 text-[10px] text-[#14664A] font-bold">
                                جديد ✨
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted leading-relaxed">
                    هذه المادة بحاجة لمحتوى أساسي وملخصات لتظهر نشطة للطلاب في الكلية. كن أول من يساهم!
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 2. Resource Title ─────────────────────────────────────── */}
      <div className="space-y-2">
        <label
          htmlFor="upload-title"
          className="block text-sm font-bold text-ink"
        >
          عنوان المورد <span className="text-destructive">*</span>
        </label>
        <input
          id="upload-title"
          type="text"
          dir="auto"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
          placeholder="مثال: ملخص الوحدة الأولى — مقدمة في الخوارزميات"
          className="w-full min-h-[52px] rounded-[14px] border border-line bg-paper px-4 text-base text-ink placeholder:text-muted transition-colors focus:border-ink/60 focus:outline-none disabled:opacity-50"
          required
        />
        <p className="text-xs text-muted leading-relaxed">
          عنوان واضح يوضح المحتوى، مثل: ملخص شامل لمنهج الفاينل، أو سلايدات الشابتر الأول.
        </p>
      </div>

      {/* ── 3. Resource Type Dropdown ────────────────────────────── */}
      <div className="space-y-2">
        <label
          htmlFor="upload-type"
          className="block text-sm font-bold text-ink"
        >
          نوع المورد <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <select
            id="upload-type"
            value={resourceType}
            onChange={(e) => handleResourceTypeChange(e.target.value as ResourceType)}
            disabled={isSubmitting}
            className="w-full min-h-[52px] appearance-none rounded-[14px] border border-line bg-paper px-4 py-2.5 pe-10 text-base text-ink transition-colors focus:border-ink/60 focus:outline-none disabled:opacity-50"
            required
          >
            {RESOURCE_TYPES.map(({ value, label, emoji }) => (
              <option key={value} value={value}>
                {emoji} {label}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 inset-inline-end-3 text-muted"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* ── 4. Target Exam Scope (3-Pill Radiogroup) ──────────────── */}
      <div className="space-y-2">
        <span className="block text-sm font-bold text-ink">
          الامتحان المستهدف <span className="text-destructive">*</span>
        </span>
        <div
          role="radiogroup"
          aria-label="الامتحان المستهدف"
          className="grid grid-cols-3 gap-2"
        >
          {TARGET_EXAMS.map(({ value, label }) => {
            const isSelected = targetExam === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setTargetExam(value)}
                disabled={isSubmitting}
                className={`min-h-[52px] rounded-[14px] px-2 py-2 text-center text-sm sm:text-base font-bold transition-all cursor-pointer disabled:opacity-50 ${
                  isSelected
                    ? "bg-btn text-btn-ink border-2 border-btn shadow-xs"
                    : "bg-paper text-ink border border-line hover:border-ink/40"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted leading-relaxed">
          {targetExam === "midterm" && "امتحانات منتصف الفصل والوحدات الأولى."}
          {targetExam === "final" && "شامل لمنهج نهاية الفصل الدراسي."}
          {targetExam === "other" && "مادة تكميلية، مراجعة عامة أو أسئلة متفرقة."}
        </p>
      </div>

      {/* ── 5. Official Syllabus Toggle (is_featured) - Admin Only ── */}
      {adminSecret && (
        <div className="rounded-[18px] border border-line bg-paper/70 p-4 transition-all">
          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">⭐</span>
                <span className="text-sm font-bold text-ink">
                  مادة رسمية (Official Syllabus)
                </span>
                <span className="rounded-md bg-hi/25 px-2 py-0.5 text-[11px] font-bold text-ink border border-hi">
                  الرف الأول المعتمد
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                تثبيت المورد كمنهاج أو سلايدات رسمية معتمدة من الجامعة في أعلى صفحة المادة.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              disabled={isSubmitting}
              className="mt-1 h-5 w-5 rounded border-line text-ink focus:ring-ink cursor-pointer accent-ink"
            />
          </label>
        </div>
      )}

      {/* ── 6. Academic Year Dropdown ─────────────────────────────── */}
      <div className="space-y-2">
        <label
          htmlFor="upload-academic-year"
          className="block text-sm font-bold text-ink"
        >
          السنة الأكاديمية <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <select
            id="upload-academic-year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            disabled={isSubmitting}
            className="w-full min-h-[52px] appearance-none rounded-[14px] border border-line bg-paper px-4 py-2.5 pe-10 text-base text-ink transition-colors focus:border-ink/60 focus:outline-none disabled:opacity-50"
            required
          >
            {ACADEMIC_YEARS.map((year) => (
              <option key={year} value={year}>
                {year === "2025/2026" ? `${year} (العام الحالي)` : year}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 inset-inline-end-3 text-muted"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* ── 7. File Dropzone OR External Link URL Input ───────────── */}
      {resourceType === "link" ? (
        <div className="space-y-2 animate-in fade-in-50">
          <label
            htmlFor="upload-link-url"
            className="block text-sm font-bold text-ink"
          >
            رابط المورد الخارجي <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-base">
              🔗
            </span>
            <input
              id="upload-link-url"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              disabled={isSubmitting}
              placeholder="https://youtube.com/... أو https://drive.google.com/..."
              className="w-full min-h-[52px] rounded-[14px] border border-line bg-paper pr-10 pl-4 py-3 text-base text-ink placeholder:text-muted transition-colors focus:border-ink/60 focus:outline-none disabled:opacity-50"
              required
              dir="ltr"
            />
          </div>
          <p className="text-xs text-muted leading-relaxed">
            يدعم روابط قوائم تشغيل YouTube، ملفات ومجلدات Google Drive، مستودعات GitHub، أو مراجع تعليمية خارجية.
          </p>
        </div>
      ) : (
        <div className="space-y-2 animate-in fade-in-50">
          <label className="block text-sm font-bold text-ink">
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
            className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[20px] border-2 border-dashed transition-all p-4 text-center ${
              isSubmitting
                ? "cursor-not-allowed opacity-50 border-line bg-paper/40"
                : isDragging
                ? "border-ink bg-hi/15 scale-[1.01]"
                : file
                ? "border-emerald-600/50 bg-[#D9EFE5]/40"
                : "border-line bg-paper/50 hover:border-ink/50 hover:bg-paper"
            }`}
          >
            {file ? (
              <>
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-line text-2xl shadow-2xs"
                >
                  📄
                </div>
                <span className="text-sm font-bold text-ink max-w-[85%] truncate">
                  {file.name}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
                  <span className="font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  {pageCount !== null && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-hi px-2 py-0.5 font-bold text-ink shadow-2xs">
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
                    className="absolute top-3 left-3 rounded-full border border-line bg-surface p-1.5 text-xs text-muted hover:border-ink hover:text-ink active:scale-95 transition-all"
                    aria-label="إزالة الملف"
                  >
                    ✕
                  </button>
                )}
              </>
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className="flex h-13 w-13 items-center justify-center rounded-2xl bg-hi text-ink shadow-xs"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                  </svg>
                </div>
                <span className="text-base font-bold text-ink">
                  {isDragging ? "أفلت الملف هنا الآن" : "اضغط لاختيار ملف PDF"}
                </span>
                <span className="text-xs text-muted">
                  أو اسحب وأفلت الملف هنا — الحد الأقصى {MAX_FILE_SIZE_MB} ميغابايت
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
      )}

      {/* ── 8. Collapsible Optional Details ───────────────────────── */}
      <div className="rounded-[18px] border border-line bg-paper/60 transition-all overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOptionalFields((prev) => !prev)}
          className="flex w-full min-h-[50px] items-center justify-between px-4 py-3 text-xs sm:text-sm font-bold text-ink hover:bg-ink/[0.02] cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>⚙️</span>
            <span>تفاصيل وخيارات إضافية (اختياري)</span>
            {(professorName || authorName || description) && (
              <span className="h-2 w-2 rounded-full bg-hi" />
            )}
          </span>
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted transition-transform duration-200"
            style={{ transform: showOptionalFields ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {showOptionalFields && (
          <div className="space-y-4 border-t border-line/60 p-4 animate-in fade-in-50 duration-150">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="upload-professor" className="block text-xs font-bold text-ink">
                  اسم المدرس / الدكتور
                </label>
                <input
                  id="upload-professor"
                  type="text"
                  value={professorName}
                  onChange={(e) => setProfessorName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="مثال: د. أحمد المحاسنة"
                  className="w-full min-h-[46px] rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted transition-colors focus:border-ink/60 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="upload-author" className="block text-xs font-bold text-ink">
                  {adminSecret ? "اسم الناشر / المُعِد" : "اسمك أو لقبك (المُعِد / المساهم)"}
                </label>
                <input
                  id="upload-author"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={adminSecret ? "افتراضي: Mohammad Al-Amour" : "مثال: إعداد الطالب / دفعة 2023"}
                  className="w-full min-h-[46px] rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted transition-colors focus:border-ink/60 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="upload-description" className="block text-xs font-bold text-ink">
                  ملاحظات أو وصف إضافي
                </label>
                <span className="text-[10px] text-muted font-mono">
                  {description.length}/150 حرف
                </span>
              </div>
              <textarea
                id="upload-description"
                rows={2}
                maxLength={150}
                dir="auto"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="مثال: يغطي الوحدات 1 حتى 3 مع أسئلة المقترحة وشرح القوانين..."
                className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-ink placeholder:text-muted transition-colors focus:border-ink/60 focus:outline-none disabled:opacity-50 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 9. Progressive Pipeline Stepper ──────────────────────── */}
      {isSubmitting && (
        <div className="rounded-[20px] border border-line bg-surface p-4 sm:p-5 shadow-xs space-y-3.5 animate-in fade-in-50">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-green animate-ping" />
              مراحل خط المعالجة (Pipeline)
            </span>
            <span className="font-mono text-ink font-bold">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Track */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-btn transition-all duration-500 ease-out"
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
                      ? "border-emerald-600/40 bg-[#D9EFE5] text-[#14664A] font-bold"
                      : isCurrent
                      ? "border-2 border-ink bg-hi/15 text-ink font-bold shadow-xs"
                      : "border-line bg-paper text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <span>{isPast || isCompleted ? "✅" : step.icon}</span>
                    <span className="font-bold truncate">{step.label}</span>
                  </div>
                  <span className="text-[10px] text-muted truncate">
                    {step.description}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Live Status Message */}
          {statusLog && (
            <div className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-xs font-mono text-muted border border-line/60">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-hi animate-pulse" />
              <span>{statusLog}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Error Message ──────────────────────────────────────────── */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-[16px] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
        >
          {errorMessage}
        </div>
      )}

      {/* ── Success Banner ─────────────────────────────────────────── */}
      {isCompleted && (
        <div
          role="status"
          className="rounded-[20px] border border-emerald-600/40 bg-[#D9EFE5] px-4 py-4 text-[#14664A] space-y-2 animate-in fade-in-50"
        >
          <div className="flex items-center gap-2 font-bold text-base">
            <span>{adminSecret ? "✅ تم رفع ونشر المورد بنجاح!" : "🎉 شكراً جزيلاً لمساهمتك القيمة!"}</span>
          </div>
          <p className="text-xs leading-relaxed text-[#14664A]">
            {adminSecret
              ? "أصبح المورد الآن متاحاً فورياً لطلاب المادة على المنصة."
              : "تم استلام الملف بنجاح! سيتم تدقيقه ونشره قريباً من قِبل إدارة المنصة ليظهر لجميع زملائك الطلبة."}
          </p>
          {successResourceId && (
            <span className="block font-mono text-[11px] text-[#14664A]/70 mt-1">
              رقم المرجع: {successResourceId}
            </span>
          )}
          {!adminSecret && (
            <div className="pt-1.5">
              <button
                type="button"
                onClick={resetFormState}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#14664A]/40 bg-[#14664A] text-white px-3.5 py-2 text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <span>📤</span>
                <span>مساهمة بملف آخر</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Submit Button & Trust Note ──────────────────────────────── */}
      <div className="space-y-2">
        <button
          type="submit"
          id="upload-submit-btn"
          disabled={isSubmitting || isCompleted}
          className={`w-full min-h-[56px] rounded-[16px] px-6 text-base font-heading font-bold transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-md ${
            isCompleted
              ? "bg-[#14664A] text-white"
              : isSubmitting
              ? "cursor-not-allowed bg-btn/60 text-btn-ink"
              : "bg-btn text-btn-ink hover:opacity-90 active:scale-[0.98]"
          }`}
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-btn-ink border-t-transparent" />
              <span>جارٍ معالجة المستند...</span>
            </span>
          ) : isCompleted ? (
            adminSecret ? "تم النشر بنجاح! ✅" : "تم الإرسال للمراجعة! ✅"
          ) : (
            adminSecret ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
                <span>بدء المعالجة والنشر 🚀</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
                <span>إرسال للمراجعة</span>
              </>
            )
          )}
        </button>
        <p className="text-center text-xs text-muted leading-relaxed">
          {adminSecret
            ? "الوضع الإداري: يُنشر الملف فورياً بدون انتظار المراجعة."
            : "يراجع فريق المنصة الملف قبل نشره لضمان خلوه من الأخطاء وحماية حقوق الجميع."}
        </p>
      </div>
    </form>
  );
}
