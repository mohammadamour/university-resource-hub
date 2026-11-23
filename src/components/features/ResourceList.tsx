"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Resource } from "@/types/database";
import NativeQuiz from "@/components/features/NativeQuiz";
import BookmarkIcon from "@/components/ui/BookmarkIcon";
import LogoMark from "@/components/ui/LogoMark";
import { toggleSavedResource, useBookmarks } from "@/lib/bookmarks";
import { track } from "@/lib/analytics";
import { getDownloadUrl } from "@/lib/utils";

// Code-split the pdf.js reader modal so initial course page JS pays 0 KB overhead
const PdfReaderModal = dynamic(
  () => import("@/components/features/PdfReaderModal"),
  { ssr: false }
);

interface ResourceListProps {
  resources: Resource[];
  courseId?: string;
  courseTitle?: string;
  courseSlug?: string;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidResourceUrl(url: string | null | undefined): boolean {
  if (!url || url === "__processing__") return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

function isInAppReadablePdf(resource: Resource): boolean {
  if (!isValidResourceUrl(resource.storage_url)) return false;
  if (resource.type === "link" || resource.type === "quiz") return false;
  const lower = resource.storage_url.toLowerCase();
  return lower.includes(".supabase.co/storage/") || /\.pdf($|[?#])/.test(lower);
}

function getPlatformMeta(res: Resource) {
  const url = (res.storage_url || "").toLowerCase();
  if (url.includes("youtube.com") || url.includes("youtu.be") || res.external_platform === "youtube") {
    return { name: "يوتيوب", badgeClass: "bg-red-500/10 text-red-600 border-red-500/20", icon: "▶️" };
  }
  if (url.includes("github.com") || res.external_platform === "github") {
    return { name: "GitHub", badgeClass: "bg-slate-500/10 text-slate-700 border-slate-500/20", icon: "💻" };
  }
  if (url.includes("drive.google.com") || res.external_platform === "drive") {
    return { name: "Google Drive", badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: "📁" };
  }
  return { name: "رابط خارجي", badgeClass: "bg-sky-500/10 text-sky-700 border-sky-500/20", icon: "🔗" };
}

/**
 * Visual thumbnail or graceful CSS warm parchment document mock.
 * Renders the real PDF page 1 image if available, or falls back to an elegant
 * mini-document mockup with dynamic category band, ruled lines, and format label.
 */
function ResourceCover({
  resource,
  isOfficial,
}: {
  resource: Resource;
  isOfficial?: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  // If thumbnail_url exists and hasn't errored out, render real image thumbnail
  if (resource.thumbnail_url && !imgError) {
    return (
      <div className="relative h-[96px] w-[72px] sm:h-[112px] sm:w-[84px] shrink-0 overflow-hidden rounded-[10px] border border-line bg-surface shadow-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resource.thumbnail_url}
          alt={resource.title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {isOfficial && (
          <div className="absolute top-1.5 right-1.5 rounded-md bg-hi px-1.5 py-0.5 text-[9px] font-bold text-ink shadow-xs">
            ⭐
          </div>
        )}
      </div>
    );
  }

  // Graceful Fallback: The warm parchment mini-document mock from Claude design!
  const isExam = resource.type === "past_exam";
  const isLink = resource.type === "link";
  const isSummary = resource.type === "summary";

  const bandColor = isOfficial
    ? "#A8361C" // tomato/official deep
    : isSummary
    ? "#14594F" // teal deep
    : isExam
    ? "#1B1F2A" // ink
    : isLink
    ? "#2E3A94" // indigo
    : "#7A4F0C"; // ochre

  return (
    <div
      aria-hidden="true"
      className="shrink-0 w-[72px] h-[96px] sm:w-[84px] sm:h-[112px] rounded-[10px] bg-[#FFFDF8] border border-[#E1D9C7] shadow-[0_8px_16px_-8px_rgba(20,24,35,0.25)] overflow-hidden p-2 sm:p-2.5 flex flex-col gap-1.5 transition-transform duration-200 group-hover:scale-[1.03]"
    >
      <div className="h-4 sm:h-5 rounded-[4px] shrink-0" style={{ backgroundColor: bandColor }} />
      <div className="h-1 sm:h-1.5 w-[90%] rounded-[3px] bg-[#E4DDCC]" />
      <div className="h-1 sm:h-1.5 w-[70%] rounded-[3px] bg-[#E4DDCC]" />
      <div className="h-1 sm:h-1.5 w-[55%] rounded-[3px] bg-hi" />
      <div className="h-1 sm:h-1.5 w-[80%] rounded-[3px] bg-[#E4DDCC]" />
      <div className="h-1 sm:h-1.5 w-[60%] rounded-[3px] bg-[#E4DDCC]" />
      <div className="mt-auto flex items-center justify-between">
        <span className="font-mono text-[9px] sm:text-[10px] font-bold tracking-wider text-muted">
          {isLink ? "LINK" : "PDF"}
        </span>
        <LogoMark size={14} className="opacity-50" />
      </div>
    </div>
  );
}

/**
 * 4-Tier Semantic Shelf Architecture:
 * 1. Shelf 1: 📚 المادة الرسمية / Official Syllabus (is_featured === true)
 * 2. Shelf 2: 🌟 ملخصات ومراجعات (type === 'summary', Midterm -> Final -> Other)
 * 3. Shelf 3: 📝 أسئلة ونماذج امتحانات (type === 'past_exam', hidden if empty)
 * 4. Shelf 4: 🗂️ أرشيف إضافي ومصادر خارجية (Collapsible Drawer with sub-categories)
 */
export default function ResourceList({
  resources,
  courseId,
  courseTitle,
  courseSlug,
}: ResourceListProps) {
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const [activeReaderResource, setActiveReaderResource] = useState<Resource | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "official" | "summary" | "past_exam">("all");
  const [selectedQuizCount, setSelectedQuizCount] = useState<5 | 10 | 20 | "all">(10);
  const [selectedQuizDifficulty, setSelectedQuizDifficulty] = useState<"balanced" | "easy" | "medium" | "hard">("balanced");

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTrackedViewRef = useRef(false);

  const { resources: savedResources } = useBookmarks();
  const savedResourceIdSet = useMemo(
    () => new Set(savedResources.map((r) => r.id)),
    [savedResources]
  );

  // Track course page view once on mount (preserving ISR by reading URL params in effect)
  useEffect(() => {
    if (hasTrackedViewRef.current || typeof window === "undefined") return;
    hasTrackedViewRef.current = true;

    try {
      const url = new URL(window.location.href);
      const deepLinkedId =
        url.searchParams.get("res") || url.searchParams.get("rid") || undefined;
      const matched = deepLinkedId
        ? resources.find((r) => r.id === deepLinkedId)
        : undefined;

      track({
        eventType: "resource_view",
        resourceId: matched?.id,
        courseId,
        courseSlug,
        resourceTitle: matched?.title,
        metadata: {
          course_title: courseTitle || null,
          resource_count: resources.length,
          deep_linked_resource_id: deepLinkedId || null,
          utm_source: url.searchParams.get("utm_source"),
          utm_medium: url.searchParams.get("utm_medium"),
          ref: url.searchParams.get("ref"),
        },
      });
    } catch {
      track({
        eventType: "resource_view",
        courseId,
        courseSlug,
        metadata: {
          course_title: courseTitle || null,
          resource_count: resources.length,
        },
      });
    }
  }, [courseId, courseSlug, courseTitle, resources]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg: string, durationMs = 2800) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), durationMs);
  };

  const handleOpenPdfReader = (resource: Resource) => {
    setActiveReaderResource(resource);
    track({
      eventType: "pdf_reader_open",
      resourceId: resource.id,
      courseId,
      courseSlug,
      resourceTitle: resource.title,
    });
  };

  const handleResourceOutboundClick = (resource: Resource, source: string) => {
    track({
      eventType: resource.type === "link" ? "external_link_click" : "pdf_download",
      resourceId: resource.id,
      courseId,
      courseSlug,
      resourceTitle: resource.title,
      metadata: {
        source,
        resource_type: resource.type,
      },
    });
  };

  const handleToggleSaveResource = (resource: Resource) => {
    if (!courseSlug) return;

    const nowSaved = toggleSavedResource({
      id: resource.id,
      title: resource.title,
      courseSlug,
      courseTitle: courseTitle || courseSlug,
      type: resource.type,
      targetExam: resource.target_exam,
      pageCount: resource.page_count,
      hasQuiz: Boolean(resource.quiz_data?.questions?.length),
    });

    track({
      eventType: nowSaved ? "bookmark_add" : "bookmark_remove",
      resourceId: resource.id,
      courseId,
      courseSlug,
      resourceTitle: resource.title,
    });

    showToast(
      nowSaved
        ? "تم حفظ المورد في مواردي السريعة 🔖"
        : "تمت إزالة المورد من المحفوظات"
    );
  };

  const handleStartQuizFromReader = (resourceId: string) => {
    setActiveReaderResource(null);
    setTimeout(() => {
      const dock = document.getElementById(`quiz-${resourceId}`);
      if (dock) {
        const trigger = dock.querySelector<HTMLButtonElement>("[data-quiz-start='true']");
        if (trigger) trigger.click();
        dock.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        document.getElementById(`res-${resourceId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 80);
  };

  // Auto-scroll and highlight target resource if deep-linked via WhatsApp / share URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      const targetId =
        url.searchParams.get("res") ||
        (window.location.hash.startsWith("#res-")
          ? window.location.hash.replace("#res-", "")
          : null);

      if (!targetId) return;

      const highlightTarget = (el: HTMLElement) => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-hi", "shadow-md");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-hi", "shadow-md");
        }, 2500);
      };

      const el = document.getElementById(`res-${targetId}`);
      if (el) {
        setTimeout(() => highlightTarget(el), 350);
      } else {
        // Target might reside inside collapsed Shelf 4 archive; open drawer and scroll after mount
        setTimeout(() => {
          setIsArchiveOpen(true);
          setTimeout(() => {
            const expandedEl = document.getElementById(`res-${targetId}`);
            if (expandedEl) highlightTarget(expandedEl);
          }, 120);
        }, 120);
      }
    } catch {
      // safe fallback
    }
  }, []);

  // WhatsApp 1-tap share with deep-link & UTM tracking.
  // Rule 6 compliant: Uses direct window.location.href assignment to prevent WKWebView popup blockage.
  const handleShareResource = (resource: Resource) => {
    if (typeof window === "undefined") return;

    const origin = window.location.origin;
    const currentPath = courseSlug ? `/courses/${courseSlug}` : window.location.pathname;
    const shareUrl = `${origin}${currentPath}?res=${resource.id}&utm_source=whatsapp&utm_medium=resource_share#res-${resource.id}`;

    const intro = courseTitle
      ? `ملخص لمادة ${courseTitle} مع بنك أسئلة وكويزات تفاعلية:`
      : `ملخص ${resource.title} مع بنك أسئلة وكويزات تفاعلية:`;

    const shareText = `${intro}\n${shareUrl}`;

    // Copy direct link to clipboard for convenience
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }

    showToast("تم فتح واتساب ونسخ الرابط للمشاركة! 📋", 3200);

    track({
      eventType: "whatsapp_share",
      resourceId: resource.id,
      courseId,
      courseSlug,
      resourceTitle: resource.title,
    });

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.location.href = waUrl;
  };

  // Deterministic sorting comparator: display_order ASC, then created_at ASC
  const sortByDisplayOrder = (a: Resource, b: Resource) => {
    const orderA = a.display_order ?? 0;
    const orderB = b.display_order ?? 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  };

  // Summaries & Exams sorting comparator: exam period (midterm -> final -> other) -> featured official first -> display_order ASC
  const sortSummaries = (a: Resource, b: Resource) => {
    const examRank = (exam: string | null | undefined) => {
      if (exam === "midterm") return 1;
      if (exam === "final") return 2;
      return 3;
    };
    const rankA = examRank(a.target_exam);
    const rankB = examRank(b.target_exam);
    if (rankA !== rankB) return rankA - rankB;

    // Featured / official items first within same exam scope
    const featA = a.is_featured ? 1 : 0;
    const featB = b.is_featured ? 1 : 0;
    if (featA !== featB) return featB - featA;

    const orderA = a.display_order ?? 0;
    const orderB = b.display_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  };

  // Filter active resources only
  const activeResources = useMemo(
    () => resources.filter((r) => (r.status || "active") === "active"),
    [resources]
  );

  // ─── Shelf 1: 📚 خطة المادة / المرجع الرسمي (Guides + Featured Syllabus/Slides) ───
  const officialSyllabusResources = useMemo(
    () =>
      activeResources
        .filter(
          (r) =>
            r.type !== "summary" &&
            r.type !== "past_exam" &&
            (r.type === "guide" || r.is_featured === true)
        )
        .sort(sortByDisplayOrder),
    [activeResources]
  );

  // ─── Shelf 2: 🌟 ملخصات دراسية ومراجعات (All type === 'summary') ───────────────
  const summaryResources = useMemo(
    () =>
      activeResources
        .filter((r) => r.type === "summary")
        .sort(sortSummaries),
    [activeResources]
  );

  // ─── Shelf 3: 📝 أسئلة سنوات ونماذج امتحانات (All type === 'past_exam') ────────
  const pastExamResources = useMemo(
    () =>
      activeResources
        .filter((r) => r.type === "past_exam")
        .sort(sortSummaries),
    [activeResources]
  );

  // ─── Shelf 4: 🗂️ أرشيف إضافي ومصادر خارجية (All other active resources) ───────
  const archiveResources = useMemo(
    () =>
      activeResources
        .filter(
          (r) =>
            !r.is_featured &&
            r.type !== "summary" &&
            r.type !== "past_exam" &&
            r.type !== "guide"
        )
        .sort(sortByDisplayOrder),
    [activeResources]
  );

  // Shelf 4 sub-categories
  const externalLinkResources = useMemo(
    () => archiveResources.filter((r) => r.type === "link"),
    [archiveResources]
  );
  const studentContributionResources = useMemo(
    () => archiveResources.filter((r) => !r.is_admin_uploaded && r.type !== "link"),
    [archiveResources]
  );
  const chapterSlideResources = useMemo(
    () => archiveResources.filter((r) => r.is_admin_uploaded !== false && r.type !== "link"),
    [archiveResources]
  );

  // Total interactive quiz questions across this course
  const totalQuizQuestions = useMemo(() => {
    return activeResources.reduce(
      (sum, r) => sum + (r.quiz_data?.questions?.length ?? 0),
      0
    );
  }, [activeResources]);

  // Handler for sidebar "ابدأ الكويز" launcher button
  const handleStartSidebarQuiz = () => {
    const firstQuizResource = activeResources.find((r) => r.quiz_data?.questions?.length);
    if (!firstQuizResource) {
      showToast("لا تتوفر أسئلة كويز لهذه المادة حالياً 📝");
      return;
    }
    const dock = document.getElementById(`quiz-${firstQuizResource.id}`);
    if (dock) {
      dock.scrollIntoView({ behavior: "smooth", block: "center" });
      const trigger = dock.querySelector<HTMLButtonElement>("[data-quiz-start='true']");
      if (trigger) trigger.click();
      showToast("تم فتح الكويز التفاعلي 🎯");
    } else {
      document.getElementById(`res-${firstQuizResource.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // Filter tabs definition: الكل -> خطة المادة / المرجع -> ملخصات دراسية -> أسئلة سنوات
  const tabs = useMemo(() => {
    const referenceCount = officialSyllabusResources.length + archiveResources.length;
    return [
      { id: "all" as const, label: "الكل", count: activeResources.length },
      ...(referenceCount > 0 || activeFilter === "official"
        ? [{ id: "official" as const, label: "خطة المادة / المرجع", count: referenceCount }]
        : []),
      ...(summaryResources.length > 0 || activeFilter === "summary"
        ? [{ id: "summary" as const, label: "ملخصات دراسية", count: summaryResources.length }]
        : []),
      ...(pastExamResources.length > 0 || activeFilter === "past_exam"
        ? [{ id: "past_exam" as const, label: "أسئلة سنوات", count: pastExamResources.length }]
        : []),
    ];
  }, [
    activeResources.length,
    officialSyllabusResources.length,
    archiveResources.length,
    summaryResources.length,
    pastExamResources.length,
    activeFilter,
  ]);

  // ─── Empty Course State Funnel ─────────────────────────────────────────────
  if (activeResources.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-line bg-surface p-8 sm:p-12 text-center" dir="rtl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-btn/10 text-2xl mb-4">
          📚
        </div>
        <h3 className="font-heading text-xl font-bold text-ink sm:text-2xl">
          لا توجد موارد أو ملخصات معتمدة لهذه المادة حتى الآن
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted sm:text-base leading-relaxed">
          كن أول من يشارك ملخصاته أو أسئلته السابقة لمساعدة زملائك الطلبة في مساق {courseTitle ? `"${courseTitle}"` : "هذه المادة"}!
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/upload?courseId=${courseId || ""}&title=${encodeURIComponent(`ملخص شامل | ${courseTitle || ""}`)}`}
            className="inline-flex items-center gap-2 rounded-[15px] bg-btn px-5 py-2.5 text-sm font-semibold text-btn-ink shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            <span>📤</span>
            <span>كن أول من يشارك ملخصاً</span>
          </Link>
        </div>
      </div>
    );
  }

  // ─── Resource Card Renderer (Used in Shelves 1, 2, 3) ─────────────────────
  const renderResourceCard = (
    resource: Resource,
    options?: { isOfficial?: boolean }
  ) => {
    const isQuiz = resource.type === "quiz";
    const isPdfReadable = isInAppReadablePdf(resource);
    const isSaved = savedResourceIdSet.has(resource.id);
    const isOfficial = Boolean(options?.isOfficial || resource.is_featured);

    // Type badge config matching UploadForm taxonomy exactly
    const typeBadge = (() => {
      switch (resource.type) {
        case "summary":
          return { label: "ملخص دراسي", icon: "📄", style: "border-[#14594F]/30 bg-[#14594F]/10 text-[#14594F]" };
        case "past_exam":
          return { label: "أسئلة سنوات", icon: "📝", style: "border-[#A8361C]/30 bg-[#A8361C]/10 text-[#A8361C]" };
        case "guide":
          return { label: "دليل دراسي / خطة", icon: "📖", style: "border-[#2E3A94]/30 bg-[#2E3A94]/10 text-[#2E3A94]" };
        case "link":
          return { label: "رابط خارجي / مرجع", icon: "🔗", style: "border-ink/20 bg-ink/5 text-ink" };
        case "other":
          return { label: "سلايدات ومصادر", icon: "📁", style: "border-[#7A4F0C]/30 bg-[#7A4F0C]/10 text-[#7A4F0C]" };
        case "quiz":
          return { label: "كويز تفاعلي", icon: "❓", style: "border-indigo-600/30 bg-indigo-500/10 text-indigo-700" };
        default:
          return null;
      }
    })();

    // Exam scope badge
    const examScopeBadge = (() => {
      if (resource.target_exam === "midterm") {
        return { label: "مادة الميد", icon: "🎯", style: "border-hi/60 bg-hi/25 text-ink font-bold" };
      }
      if (resource.target_exam === "final") {
        return { label: "مادة الفاينل", icon: "🏁", style: "border-ink/30 bg-ink/10 text-ink font-bold" };
      }
      if (resource.target_exam === "other" && (resource.type === "summary" || resource.type === "past_exam")) {
        return { label: "شامل / أخرى", icon: "🌐", style: "border-line bg-surface text-muted" };
      }
      return null;
    })();

    const quizQuestionsCount = resource.quiz_data?.questions?.length ?? 0;

    const mainInfo = (
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        {/* Row 1: Badges (Official + Resource Type + Exam Scope + Quiz) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {isOfficial && (
            <span className="inline-flex items-center gap-1 rounded-md bg-hi/25 border border-hi/50 px-2 py-0.5 text-[11px] font-bold text-ink shrink-0">
              <span>⭐</span>
              <span>رسمي معتمد</span>
            </span>
          )}
          {typeBadge && (
            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold shrink-0 ${typeBadge.style}`}>
              <span>{typeBadge.icon}</span>
              <span>{typeBadge.label}</span>
            </span>
          )}
          {examScopeBadge && (
            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] shrink-0 ${examScopeBadge.style}`}>
              <span>{examScopeBadge.icon}</span>
              <span>{examScopeBadge.label}</span>
            </span>
          )}
          {quizQuestionsCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-hi/60 bg-hi/20 px-2 py-0.5 text-[11px] font-bold text-ink shrink-0">
              <span>✨</span>
              <span>كويز ({quizQuestionsCount} سؤال)</span>
            </span>
          )}
        </div>

        {/* Row 2: Title */}
        <span
          dir="auto"
          className="text-base sm:text-lg font-bold text-ink group-hover:text-btn transition-colors line-clamp-2 leading-snug"
        >
          {resource.title}
        </span>

        {/* Row 3: Streamlined Metadata */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted truncate">
          {resource.professor_name ? (
            <span className="truncate">👨‍🏫 د. {resource.professor_name}</span>
          ) : resource.author_name ? (
            <span className="truncate">👤 {resource.author_name}</span>
          ) : resource.is_admin_uploaded ? (
            <span className="truncate">✦ معتمد</span>
          ) : null}

          {resource.page_count ? (
            <span className="shrink-0 font-mono">• 📄 {resource.page_count} ص</span>
          ) : null}

          {resource.file_size_bytes ? (
            <span className="shrink-0" dir="ltr">• {formatBytes(resource.file_size_bytes)}</span>
          ) : null}
        </div>

        {resource.description && (
          <p
            dir="auto"
            className="text-xs text-muted/80 line-clamp-1 mt-0.5"
          >
            {resource.description}
          </p>
        )}
      </div>
    );

    return (
      <li
        id={`res-${resource.id}`}
        key={resource.id}
        className={`group flex flex-col overflow-hidden rounded-[22px] border transition-all duration-300 ${
          isOfficial
            ? "border-hi/60 bg-surface shadow-xs hover:border-hi hover:shadow-md"
            : "border-line bg-surface shadow-xs hover:border-muted/60 hover:shadow-md"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 transition-colors group-hover:bg-paper/40">
          {/* Main Click Target (Cover + Details) */}
          {isQuiz && !resource.quiz_data ? (
            <button
              type="button"
              onClick={() => setActiveEmbedId(activeEmbedId === resource.id ? null : resource.id)}
              className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4 text-start cursor-pointer"
            >
              <ResourceCover resource={resource} isOfficial={isOfficial} />
              {mainInfo}
            </button>
          ) : isPdfReadable ? (
            <button
              type="button"
              onClick={() => handleOpenPdfReader(resource)}
              className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4 text-start cursor-pointer"
              title="قراءة الملف داخل الموقع"
            >
              <ResourceCover resource={resource} isOfficial={isOfficial} />
              {mainInfo}
            </button>
          ) : isValidResourceUrl(resource.storage_url) ? (
            <a
              href={
                resource.type === "link"
                  ? resource.storage_url
                  : getDownloadUrl(resource.storage_url, resource.title)
              }
              target={resource.type === "link" ? "_blank" : undefined}
              rel={resource.type === "link" ? "noopener noreferrer" : undefined}
              onClick={() => handleResourceOutboundClick(resource, "card_body")}
              className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4 cursor-pointer"
            >
              <ResourceCover resource={resource} isOfficial={isOfficial} />
              {mainInfo}
            </a>
          ) : (
            <div
              className="flex min-w-0 flex-1 items-center gap-3.5 opacity-60 cursor-not-allowed sm:gap-4"
              title="الملف قيد المعالجة أو التجهيز حالياً"
            >
              <ResourceCover resource={resource} isOfficial={isOfficial} />
              {mainInfo}
            </div>
          )}

          {/* Action Buttons (Download/Open + WhatsApp Share + Bookmark) */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
            {/* Primary Action Button (Download/Read/Open) */}
            {isQuiz && !resource.quiz_data ? (
              <button
                type="button"
                onClick={() => setActiveEmbedId(activeEmbedId === resource.id ? null : resource.id)}
                className="h-11 px-4 rounded-[14px] bg-btn text-btn-ink font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
                title="عرض الاختبار"
              >
                <span>{activeEmbedId === resource.id ? "إغلاق" : "اختبار"}</span>
                <span className="text-xs">{activeEmbedId === resource.id ? "▲" : "◀"}</span>
              </button>
            ) : isPdfReadable ? (
              <button
                type="button"
                onClick={() => handleOpenPdfReader(resource)}
                className="h-11 px-4 rounded-[14px] bg-btn text-btn-ink font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
                title="قراءة الملف داخل الموقع"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>قراءة</span>
              </button>
            ) : isValidResourceUrl(resource.storage_url) ? (
              <a
                href={
                  resource.type === "link"
                    ? resource.storage_url
                    : getDownloadUrl(resource.storage_url, resource.title)
                }
                target={resource.type === "link" ? "_blank" : undefined}
                rel={resource.type === "link" ? "noopener noreferrer" : undefined}
                onClick={() => handleResourceOutboundClick(resource, "card_button")}
                className="h-11 px-4 rounded-[14px] bg-btn text-btn-ink font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
                title={resource.type === "link" ? "زيارة الرابط" : "تحميل الملف"}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/>
                </svg>
                <span>{resource.type === "link" ? "زيارة" : "تحميل"}</span>
              </a>
            ) : (
              <div
                className="h-11 px-3 rounded-[14px] bg-line/40 text-muted opacity-60 cursor-not-allowed inline-flex items-center gap-1 text-xs"
                title="الملف قيد المعالجة"
              >
                <span>⏳</span>
                <span>قيد التجهيز</span>
              </div>
            )}

            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={() => handleShareResource(resource)}
              className="w-11 h-11 rounded-[14px] border border-line bg-surface text-ink inline-flex items-center justify-center transition-all hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/30 hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
              title="مشاركة الملخص عبر واتساب"
              aria-label="مشاركة عبر واتساب"
            >
              <svg
                className="h-4.5 w-4.5 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </button>

            {/* Resource Bookmark Button */}
            <button
              type="button"
              onClick={() => handleToggleSaveResource(resource)}
              aria-pressed={isSaved}
              className={`w-11 h-11 rounded-[14px] border inline-flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer ${
                isSaved
                  ? "bg-hi/25 text-ink border-hi/60"
                  : "bg-surface border-line text-muted hover:bg-line/40 hover:text-ink"
              }`}
              title={isSaved ? "إزالة من مواردي المحفوظة" : "حفظ المورد للرجوع السريع"}
              aria-label={isSaved ? "إزالة من المحفوظات" : "حفظ المورد"}
            >
              <BookmarkIcon filled={isSaved} className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Native Quiz Player (Docked Action Bar inside the same card) */}
        {resource.quiz_data && (
          <div
            id={`quiz-${resource.id}`}
            className="border-t border-line bg-paper/40 px-3.5 py-2.5 sm:px-4 sm:py-3 transition-colors group-hover:bg-paper/70"
          >
            <NativeQuiz
              quizData={resource.quiz_data}
              sourceTitle={resource.title}
              defaultOpen={isQuiz}
              resourceId={resource.id}
              courseId={resource.course_id}
            />
          </div>
        )}

        {/* Embedded Iframe for legacy URL quizzes */}
        {isQuiz && !resource.quiz_data && activeEmbedId === resource.id && (
          <div className="border-t border-line bg-surface p-4 sm:p-6">
            <iframe
              src={resource.storage_url}
              className="min-h-150 w-full rounded-lg border border-line bg-paper shadow-sm"
              allowFullScreen
            />
          </div>
        )}
      </li>
    );
  };

  // ─── Subdued Row Renderer (Used inside Shelf 4 Drawer) ─────────────────────
  const renderSubduedArchiveRow = (res: Resource) => {
    const isPdfReadable = isInAppReadablePdf(res);
    const isSaved = savedResourceIdSet.has(res.id);
    const examScopeLabel =
      res.target_exam === "midterm"
        ? "مادة الميد"
        : res.target_exam === "final"
        ? "مادة الفاينل"
        : null;

    const infoBody = (
      <div className="flex items-center gap-3 min-w-0 flex-1 text-start">
        <span className="text-lg shrink-0 opacity-80">
          {res.type === "past_exam" ? "📝" : res.type === "guide" ? "📖" : "📎"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span dir="auto" className="text-sm font-medium text-ink truncate">
              {res.title}
            </span>
            {examScopeLabel && (
              <span className="rounded bg-line/40 px-2 py-0.5 text-[10px] font-semibold text-muted">
                {examScopeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
            {res.author_name ? (
              <span>مساهمة: {res.author_name}</span>
            ) : (
              <span>مساهمة طالب</span>
            )}
            {res.page_count ? <span>• 📄 {res.page_count} صفحة</span> : null}
            {res.file_size_bytes ? (
              <span dir="ltr">• {formatBytes(res.file_size_bytes)}</span>
            ) : null}
          </div>
        </div>
      </div>
    );

    return (
      <div
        id={`res-${res.id}`}
        key={res.id}
        className="flex items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-line/20 transition-colors"
      >
        {isPdfReadable ? (
          <button
            type="button"
            onClick={() => handleOpenPdfReader(res)}
            className="flex min-w-0 flex-1 items-center cursor-pointer"
            title="قراءة الملف داخل الموقع"
          >
            {infoBody}
          </button>
        ) : (
          infoBody
        )}

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleToggleSaveResource(res)}
            aria-pressed={isSaved}
            title={isSaved ? "إزالة من المحفوظات" : "حفظ المورد"}
            aria-label={isSaved ? "إزالة من المحفوظات" : "حفظ المورد"}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
              isSaved
                ? "border-hi/60 bg-hi/25 text-ink"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            <BookmarkIcon filled={isSaved} className="h-3.5 w-3.5" />
          </button>

          {isValidResourceUrl(res.storage_url) ? (
            <a
              href={
                res.type === "link"
                  ? res.storage_url
                  : getDownloadUrl(res.storage_url, res.title)
              }
              target={res.type === "link" ? "_blank" : undefined}
              rel={res.type === "link" ? "noopener noreferrer" : undefined}
              onClick={() => handleResourceOutboundClick(res, "archive_button")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-btn hover:text-btn-ink hover:border-btn transition-all shrink-0"
            >
              <span>{res.type === "link" ? "زيارة" : "تحميل"}</span>
              <span>{res.type === "link" ? "↗" : "⬇"}</span>
            </a>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-line/30 px-3 py-1.5 text-xs font-semibold text-muted opacity-60 cursor-not-allowed shrink-0"
              title="الملف قيد المعالجة حالياً"
            >
              <span>قيد التجهيز</span>
              <span>⏳</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  const hasVisibleResources =
    activeFilter === "all"
      ? activeResources.length > 0
      : activeFilter === "official"
      ? officialSyllabusResources.length > 0 || archiveResources.length > 0
      : activeFilter === "summary"
      ? summaryResources.length > 0
      : pastExamResources.length > 0;

  return (
    <div dir="rtl">
      {/* ── Two-column layout: main shelves + sticky sidebar ──────────────── */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">

        {/* ── Main column: Filter Tabs + 4-tier shelf architecture ───────────── */}
        <div className="flex-[999_1_560px] min-w-0 space-y-8 w-full">

          {/* Filter Tabs */}
          <div role="group" aria-label="نوع الملفات" className="flex flex-wrap gap-2.5">
            {tabs.map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`min-h-[46px] px-4.5 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2.5 transition-all cursor-pointer border-[1.5px] ${
                    isActive
                      ? "bg-btn text-btn-ink border-btn shadow-xs"
                      : "bg-surface text-ink border-line hover:border-muted/50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`min-w-6 h-6 px-1.5 rounded-full text-xs font-mono inline-flex items-center justify-center ${
                      isActive ? "bg-white/20 text-btn-ink" : "bg-line/60 text-muted"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ─── Shelf 1: 📚 خطة المادة / المرجع ───────────────────────── */}
          {(activeFilter === "all" || activeFilter === "official") && officialSyllabusResources.length > 0 && (
            <section className="space-y-4" aria-label="خطة المادة والمرجع الرسمي">
              <div className="border-b border-line pb-3">
                <h2 className="font-heading text-[27px] font-bold text-ink flex items-center gap-2">
                  <span>📚</span>
                  <span>خطة المادة / المرجع</span>
                </h2>
                <p className="mt-1 text-xs text-muted sm:text-sm">
                  الخطة الدراسية، كتاب المادة، أو السلايدات الرسمية الصادرة عن الجامعة ومدرس المساق.
                </p>
              </div>

              <ul className="space-y-3 sm:space-y-3.5 list-none p-0 m-0">
                {officialSyllabusResources.map((r) =>
                  renderResourceCard(r, { isOfficial: true })
                )}
              </ul>
            </section>
          )}

          {/* ─── Shelf 2: 🌟 ملخصات دراسية ومراجعات ───────────────────── */}
          {(activeFilter === "all" || activeFilter === "summary") && summaryResources.length > 0 && (
            <section className="space-y-4" aria-label="ملخصات ومراجعات شاملة">
              <div className="border-b border-line pb-3">
                <h2 className="font-heading text-[27px] font-bold text-ink flex items-center gap-2">
                  <span>🌟</span>
                  <span>ملخصات دراسية ومراجعات شاملة</span>
                </h2>
                <p className="mt-1 text-xs text-muted sm:text-sm">
                  شروحات ومذكرات مركزة تغطي مواضيع الامتحانات مع بنوك أسئلة تفاعلية ذكية.
                </p>
              </div>

              <ul className="space-y-3 sm:space-y-3.5 list-none p-0 m-0">
                {summaryResources.map((r) => renderResourceCard(r))}
              </ul>
            </section>
          )}

          {/* ─── Shelf 3: 📝 أسئلة سنوات ونماذج امتحانات ─────────────────── */}
          {(activeFilter === "all" || activeFilter === "past_exam") && pastExamResources.length > 0 && (
            <section className="space-y-4" aria-label="أسئلة سنوات ونماذج امتحانات">
              <div className="border-b border-line pb-3">
                <h2 className="font-heading text-[27px] font-bold text-ink flex items-center gap-2">
                  <span>📝</span>
                  <span>أسئلة سنوات ونماذج امتحانات</span>
                </h2>
                <p className="mt-1 text-xs text-muted sm:text-sm">
                  تجميعات امتحانات السنوات السابقة وأسئلة التدريب للاختبارات النصفية والنهائية.
                </p>
              </div>

              <ul className="space-y-3 sm:space-y-3.5 list-none p-0 m-0">
                {pastExamResources.map((r) => renderResourceCard(r))}
              </ul>
            </section>
          )}

          {/* ─── Shelf 4: 🗂️ أرشيف إضافي ومصادر خارجية (Collapsible) ──── */}
          {(activeFilter === "all" || activeFilter === "official") && archiveResources.length > 0 && (
            <section
              className="rounded-[22px] border border-line bg-surface overflow-hidden shadow-sm transition-all"
              aria-label="أرشيف إضافي ومصادر خارجية"
            >
              <button
                type="button"
                onClick={() => setIsArchiveOpen(!isArchiveOpen)}
                className="flex w-full items-center justify-between p-4 sm:p-5 text-start hover:bg-line/30 transition-colors cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-ink text-base sm:text-lg">
                    <span>🗂️</span>
                    <span>أرشيف إضافي ومصادر خارجية</span>
                    <span
                      className="rounded-full bg-line/60 px-2.5 py-0.5 text-xs font-semibold text-muted"
                      dir="ltr"
                    >
                      {archiveResources.length}
                    </span>
                  </div>
                  <p className="text-xs text-muted sm:text-sm">
                    سلايدات الفصول المنفردة، شروحات يوتيوب، مراجع إضافية، ومساهمات الطلاب.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink hidden sm:inline">
                    {isArchiveOpen ? "طي الأرشيف" : "عرض المزيد"}
                  </span>
                  <span className="rounded-lg bg-line/40 p-2 text-xs font-bold text-muted transition-transform duration-200">
                    {isArchiveOpen ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {isArchiveOpen && (
                <div className="border-t border-line bg-paper/30 p-4 sm:p-6 space-y-6 animate-in fade-in-50 duration-200">
                  {/* External Links */}
                  {externalLinkResources.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                        <span>🔗</span>
                        <span>روابط ومصادر خارجية</span>
                        <span className="text-xs text-muted font-normal">
                          ({externalLinkResources.length})
                        </span>
                      </h4>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {externalLinkResources.map((res) => {
                          const meta = getPlatformMeta(res);
                          const valid = isValidResourceUrl(res.storage_url);

                          if (!valid) {
                            return (
                              <div
                                key={res.id}
                                className="opacity-60 cursor-not-allowed flex flex-col justify-between rounded-[18px] border border-line bg-surface p-4"
                                title="الرابط قيد التحديث"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                                    >
                                      <span>{meta.icon}</span>
                                      <span>{meta.name}</span>
                                    </span>
                                  </div>
                                  <h5 dir="auto" className="text-sm font-bold text-ink line-clamp-2">
                                    {res.title}
                                  </h5>
                                  {res.description && (
                                    <p dir="auto" className="text-xs text-muted line-clamp-2">
                                      {res.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <a
                              key={res.id}
                              href={res.storage_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleResourceOutboundClick(res, "external_card")}
                              className="group flex flex-col justify-between rounded-[18px] border border-line bg-surface p-4 transition-all duration-200 hover:border-muted hover:shadow-md active:scale-[0.99]"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                                  >
                                    <span>{meta.icon}</span>
                                    <span>{meta.name}</span>
                                  </span>
                                  <span className="text-xs text-muted group-hover:text-ink transition-colors">
                                    ↗
                                  </span>
                                </div>

                                <h5 dir="auto" className="text-sm font-bold text-ink group-hover:text-btn transition-colors line-clamp-2">
                                  {res.title}
                                </h5>

                                {res.description && (
                                  <p dir="auto" className="text-xs text-muted line-clamp-2">
                                    {res.description}
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted">
                                <span>فتح المورد الخارجي</span>
                                <span className="font-semibold text-ink">زيارة الموقع ←</span>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Chapter Slides */}
                  {chapterSlideResources.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                        <span>📎</span>
                        <span>سلايدات وفصول إضافية</span>
                        <span className="text-xs text-muted font-normal">
                          ({chapterSlideResources.length})
                        </span>
                      </h4>
                      <div className="rounded-xl border border-line bg-surface overflow-hidden divide-y divide-line">
                        {chapterSlideResources.map(renderSubduedArchiveRow)}
                      </div>
                    </div>
                  )}

                  {/* Student Community */}
                  {studentContributionResources.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                        <span>👥</span>
                        <span>مساهمات الطلاب</span>
                        <span className="text-xs text-muted font-normal">
                          ({studentContributionResources.length})
                        </span>
                      </h4>
                      <div className="rounded-xl border border-line bg-surface overflow-hidden divide-y divide-line">
                        {studentContributionResources.map(renderSubduedArchiveRow)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Empty Filter State (when current filter yields 0 items) */}
          {!hasVisibleResources && (
            <div className="rounded-[22px] border border-dashed border-line bg-surface p-8 sm:p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-line/50 text-2xl mb-3">
                🔍
              </div>
              <h3 className="font-heading text-lg font-bold text-ink sm:text-xl">
                لا توجد ملفات مطابقة للفلتر المحدد
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs sm:text-sm text-muted leading-relaxed">
                لم نجد مواد تحت هذا القسم في هذا المساق حالياً.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className="inline-flex items-center gap-2 rounded-xl bg-btn px-4 py-2 text-xs font-semibold text-btn-ink hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  <span>🔄</span>
                  <span>عرض جميع الموارد ({activeResources.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Crowdsourcing Banner */}
          <div className="rounded-[22px] border border-dashed border-line bg-surface p-6 text-center sm:p-8">
            <h4 className="font-heading text-base font-bold text-ink sm:text-lg">
              💡 هل لديك تلخيص أفضل أو أسئلة إضافية؟
            </h4>
            <p className="mt-1 text-xs text-muted sm:text-sm max-w-lg mx-auto leading-relaxed">
              ساهم في إثراء أرشيف المادة وساعد زملاءك في الدفعة على التفوق! يتم مراجعة الملف من قبل فريق المنصة قبل نشره.
            </p>
            <div className="mt-4">
              <Link
                href={`/upload?courseId=${courseId || ""}&title=${encodeURIComponent(`ملخص | ${courseTitle || ""}`)}`}
                className="inline-flex items-center gap-2 rounded-[14px] bg-btn px-5 py-2.5 text-xs font-bold text-btn-ink shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
              >
                <span>📤</span>
                <span>شارك ملخصك مع زملائك</span>
              </Link>
            </div>
          </div>

        </div>

        {/* ── Sidebar column: Quiz Launcher + Direct Link + Upload CTA ──────── */}
        <aside className="w-full lg:w-[320px] lg:max-w-[340px] shrink-0 flex flex-col gap-5 lg:sticky lg:top-24">
          
          {/* 1. Quiz Launcher Card (Dark theme with Reem Kufi & SVG progress ring) */}
          {totalQuizQuestions > 0 && (
            <div className="bg-btn text-btn-ink rounded-[26px] p-6 flex flex-col gap-4.5 shadow-md">
              <div className="flex items-center justify-between gap-3">
                <span className="bg-hi text-ink px-3 py-1 rounded-[9px] font-heading text-xl font-bold">
                  اختبر نفسك
                </span>
                <svg aria-hidden="true" width="44" height="44" viewBox="0 0 100 100" className="shrink-0 -rotate-90">
                  <circle cx="50" cy="50" r="45" fill="none" strokeWidth="10" className="stroke-btn-ink/20" />
                  <circle cx="50" cy="50" r="45" fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray="282.74" strokeDashoffset="141" className="stroke-hi" />
                </svg>
              </div>

              <p className="text-[15px] leading-relaxed opacity-90 m-0">
                كويز تفاعلي من {totalQuizQuestions} سؤال، وكل إجابة معها شرح يوضح ليش.
              </p>

              {/* Question Count Selector */}
              <div className="flex flex-col gap-2">
                <span className="text-[13px] opacity-80">عدد الأسئلة</span>
                <div className="flex flex-wrap gap-2">
                  {([5, 10, 20, "all"] as const).map((cnt) => {
                    const isPicked = selectedQuizCount === cnt;
                    return (
                      <button
                        key={cnt}
                        type="button"
                        aria-pressed={isPicked}
                        onClick={() => setSelectedQuizCount(cnt)}
                        className={`min-w-[46px] h-11 px-3.5 rounded-[12px] text-[14px] font-semibold transition-all cursor-pointer ${
                          isPicked
                            ? "bg-hi text-ink font-bold shadow-xs"
                            : "bg-btn-ink/15 text-btn-ink hover:bg-btn-ink/25"
                        }`}
                      >
                        {cnt === "all" ? "الكل" : cnt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div className="flex flex-col gap-2">
                <span className="text-[13px] opacity-80">الصعوبة</span>
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: "balanced" as const, label: "متوازن" },
                    { id: "easy" as const, label: "سهل" },
                    { id: "medium" as const, label: "متوسط" },
                    { id: "hard" as const, label: "صعب" },
                  ]).map((lvl) => {
                    const isPicked = selectedQuizDifficulty === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        aria-pressed={isPicked}
                        onClick={() => setSelectedQuizDifficulty(lvl.id)}
                        className={`h-11 px-3.5 rounded-[12px] text-[14px] font-semibold transition-all cursor-pointer ${
                          isPicked
                            ? "bg-hi text-ink font-bold shadow-xs"
                            : "bg-btn-ink/15 text-btn-ink hover:bg-btn-ink/25"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start Quiz Action */}
              <button
                type="button"
                onClick={handleStartSidebarQuiz}
                className="h-[52px] rounded-[16px] bg-hi text-ink font-heading text-lg font-bold hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer w-full flex items-center justify-center mt-1"
              >
                ابدأ الكويز
              </button>
            </div>
          )}

          {/* 2. Direct Link Copy Widget */}
          <div className="bg-surface border border-line rounded-[22px] p-5 flex flex-col gap-3">
            <span className="font-bold text-ink text-base">رابط مباشر للمادة</span>
            <span className="text-sm leading-relaxed text-muted">
              الصقه في القروب، ويفتح مباشرة على هذه الصفحة.
            </span>
            <div className="flex items-center gap-2 border border-dashed border-muted/50 rounded-[14px] p-1.5 pe-2">
              <span className="flex-1 min-w-0 font-mono text-xs text-ink/80 text-left px-2 truncate" dir="ltr">
                {`molakhasat.me/courses/${courseSlug || ""}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  const url = `https://molakhasat.me/courses/${courseSlug || ""}`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(url);
                    showToast("تم نسخ الرابط المباشر للمادة! 📋");
                  }
                }}
                aria-label="نسخ الرابط"
                className="shrink-0 w-11 h-11 rounded-[12px] bg-btn text-btn-ink flex items-center justify-center hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="8" width="12" height="12" rx="2"/>
                  <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>
                </svg>
              </button>
            </div>
          </div>

          {/* 3. Upload CTA Widget */}
          <div className="border-[1.5px] border-dashed border-line rounded-[22px] p-5 flex flex-col items-start gap-3 bg-surface/50">
            <span className="font-bold text-ink text-base">عندك ملخص أو امتحان قديم؟</span>
            <span className="text-sm leading-relaxed text-muted">
              شاركه ويستفيد منه كل الدفعة، واسمك بيظهر عليه.
            </span>
            <Link
              href={`/upload?courseId=${courseId || ""}&title=${encodeURIComponent(`ملخص | ${courseTitle || ""}`)}`}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-[14px] border-[1.5px] border-ink bg-transparent px-4 text-sm font-semibold text-ink transition-all hover:bg-ink/8 active:scale-95 cursor-pointer"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span>ارفع ملف</span>
            </Link>
          </div>

        </aside>

      </div>

      {/* Lazy-Loaded In-App PDF Reader Modal */}
      {activeReaderResource && (
        <PdfReaderModal
          key={activeReaderResource.id}
          resource={activeReaderResource}
          courseSlug={courseSlug}
          isSaved={savedResourceIdSet.has(activeReaderResource.id)}
          onToggleSave={() => handleToggleSaveResource(activeReaderResource)}
          onClose={() => setActiveReaderResource(null)}
          onStartQuiz={handleStartQuizFromReader}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-line bg-btn text-btn-ink px-4 py-2.5 text-xs font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
