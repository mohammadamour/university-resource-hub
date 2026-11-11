"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Resource } from "@/types/database";
import NativeQuiz from "@/components/features/NativeQuiz";
import BookmarkIcon from "@/components/ui/BookmarkIcon";
import { toggleSavedResource, useBookmarks } from "@/lib/bookmarks";

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
    return { name: "يوتيوب", badgeClass: "bg-red-500/10 text-red-400 border-red-500/20", icon: "▶️" };
  }
  if (url.includes("github.com") || res.external_platform === "github") {
    return { name: "GitHub", badgeClass: "bg-slate-500/10 text-slate-300 border-slate-500/20", icon: "💻" };
  }
  if (url.includes("drive.google.com") || res.external_platform === "drive") {
    return { name: "Google Drive", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: "📁" };
  }
  return { name: "رابط خارجي", badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20", icon: "🔗" };
}

/**
 * Visual thumbnail or graceful CSS gradient book cover for academic resources.
 * Renders the real PDF page 1 image if available, or falls back to an elegant
 * digital binder cover with dynamic taxonomy colors, title micro-typography, and spine highlight.
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
      <div className="relative h-17 w-12 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted/40 shadow-xs sm:h-20 sm:w-15">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resource.thumbnail_url}
          alt={resource.title}
          loading="lazy"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {isOfficial && (
          <div className="absolute top-1 right-1 rounded-sm bg-amber-500/90 px-1 py-0.2 text-[8px] font-bold text-white shadow-xs">
            ⭐
          </div>
        )}
      </div>
    );
  }

  // Graceful Fallback: Sleek Digital Book Binder Graphic (Zero redundant text!)
  const isSummary = resource.type === "summary";
  const isExam = resource.type === "past_exam";
  const isLink = resource.type === "link";
  const isGuide = resource.type === "guide";

  const gradientClass = isOfficial
    ? "from-amber-500/25 via-amber-600/15 to-amber-950/40 border-amber-500/30 text-amber-300"
    : isSummary
    ? "from-blue-600/25 via-primary/20 to-blue-950/40 border-blue-500/25 text-blue-300"
    : isExam
    ? "from-amber-600/25 via-orange-950/20 to-stone-900/40 border-amber-500/25 text-amber-300"
    : isGuide
    ? "from-emerald-600/25 via-teal-950/20 to-slate-900/40 border-emerald-500/25 text-emerald-300"
    : isLink
    ? "from-violet-600/25 via-purple-950/20 to-slate-900/40 border-violet-500/25 text-violet-300"
    : "from-secondary via-secondary/80 to-muted border-border text-muted-foreground";

  const icon = isOfficial
    ? "📚"
    : isSummary
    ? "📄"
    : resource.type === "quiz"
    ? "✨"
    : isExam
    ? "📝"
    : isGuide
    ? "📖"
    : isLink
    ? "🔗"
    : "📎";

  const typeLabel = isOfficial
    ? "رسمي"
    : isSummary
    ? "ملخص"
    : isExam
    ? "امتحان"
    : isGuide
    ? "دليل"
    : isLink
    ? "رابط"
    : "ملف";

  return (
    <div
      className={`relative flex h-17 w-12 shrink-0 flex-col justify-between overflow-hidden rounded-xl border bg-gradient-to-br p-1.5 shadow-xs transition-transform duration-200 group-hover:scale-[1.03] sm:h-20 sm:w-15 sm:p-2 ${gradientClass}`}
    >
      {/* Decorative Book Spine Highlight on Right (in RTL right is spine) */}
      <div className="absolute inset-y-0 right-0 w-1 bg-white/15" />

      {/* Top: Icon + Optional Badge */}
      <div className="flex items-center justify-between text-sm sm:text-base pl-0.5">
        <span>{icon}</span>
        {isOfficial && <span className="text-[9px]">⭐</span>}
      </div>

      {/* Center: Format Badge (Clean and graphic) */}
      <div className="my-auto text-center">
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider opacity-90 sm:text-[10px]">
          {isLink ? "LINK" : "PDF"}
        </span>
      </div>

      {/* Bottom: Type or Scope Mini Tag */}
      <div className="flex items-center justify-center border-t border-white/10 pt-0.5 sm:pt-1">
        <span className="text-[8px] font-bold opacity-80 sm:text-[9px]">
          {resource.target_exam === "midterm"
            ? "ميد"
            : resource.target_exam === "final"
            ? "فاينل"
            : typeLabel}
        </span>
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
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { resources: savedResources } = useBookmarks();
  const savedResourceIdSet = useMemo(
    () => new Set(savedResources.map((r) => r.id)),
    [savedResources]
  );

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

  const handleToggleSaveResource = (resource: Resource) => {
    // Require a valid course slug so drawer deep-links resolve properly (/courses/[slug])
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
        el.classList.add("ring-2", "ring-accent", "shadow-md");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-accent", "shadow-md");
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

  // WhatsApp 1-tap share with deep-link & UTM tracking
  const handleShareResource = (resource: Resource) => {
    if (typeof window === "undefined") return;

    const origin = window.location.origin;
    const currentPath = courseSlug ? `/courses/${courseSlug}` : window.location.pathname;
    const shareUrl = `${origin}${currentPath}?res=${resource.id}&utm_source=whatsapp&utm_medium=resource_share#res-${resource.id}`;

    // Clean, high-converting WhatsApp message requested by students
    const intro = courseTitle
      ? `ملخص لمادة ${courseTitle} مع بنك أسئلة وكويزات تفاعلية:`
      : `ملخص ${resource.title} مع بنك أسئلة وكويزات تفاعلية:`;

    const shareText = `${intro}\n${shareUrl}`;

    // Copy direct link to clipboard for convenience
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }

    showToast("تم فتح واتساب ونسخ الرابط للمشاركة! 📋", 3200);

    // Open WhatsApp Web or Mobile App
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
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

  // Summaries sorting comparator: midterm first -> final second -> other third -> display_order ASC
  const sortSummaries = (a: Resource, b: Resource) => {
    const examRank = (exam: string | null | undefined) => {
      if (exam === "midterm") return 1;
      if (exam === "final") return 2;
      return 3;
    };
    const rankA = examRank(a.target_exam);
    const rankB = examRank(b.target_exam);
    if (rankA !== rankB) return rankA - rankB;

    const orderA = a.display_order ?? 0;
    const orderB = b.display_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  };

  // Filter active resources only
  const activeResources = resources.filter((r) => (r.status || "active") === "active");

  // ─── Shelf 1: 📚 المادة الرسمية / Official Syllabus (is_featured === true) ───
  const officialSyllabusResources = activeResources
    .filter((r) => r.is_featured === true)
    .sort(sortByDisplayOrder);

  // ─── Shelf 2: 🌟 ملخصات ومراجعات (type === 'summary', not featured) ───────────
  const summaryResources = activeResources
    .filter((r) => !r.is_featured && r.type === "summary")
    .sort(sortSummaries);

  // ─── Shelf 3: 📝 أسئلة ونماذج امتحانات (type === 'past_exam', not featured) ────
  const pastExamResources = activeResources
    .filter((r) => !r.is_featured && r.type === "past_exam")
    .sort(sortByDisplayOrder);

  // ─── Shelf 4: 🗂️ أرشيف إضافي ومصادر خارجية (All other active resources) ───────
  const archiveResources = activeResources
    .filter(
      (r) =>
        !r.is_featured &&
        r.type !== "summary" &&
        r.type !== "past_exam"
    )
    .sort(sortByDisplayOrder);

  // Shelf 4 sub-categories
  const externalLinkResources = archiveResources.filter((r) => r.type === "link");
  const studentContributionResources = archiveResources.filter(
    (r) => !r.is_admin_uploaded && r.type !== "link"
  );
  const chapterSlideResources = archiveResources.filter(
    (r) => r.is_admin_uploaded !== false && r.type !== "link"
  );

  // ─── Empty Course State Funnel ─────────────────────────────────────────────
  if (activeResources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 sm:p-12 text-center backdrop-blur-sm" dir="rtl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl mb-4">
          📚
        </div>
        <h3 className="text-lg font-bold text-foreground sm:text-xl">
          لا توجد موارد أو ملخصات معتمدة لهذه المادة حتى الآن
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base leading-relaxed">
          كن أول من يشارك ملخصاته أو أسئلته السابقة لمساعدة زملائك الطلبة في مساق {courseTitle ? `"${courseTitle}"` : "هذه المادة"}!
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/upload?courseId=${courseId || ""}&title=${encodeURIComponent(`ملخص شامل | ${courseTitle || ""}`)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
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
    const examScopeLabel =
      resource.target_exam === "midterm"
        ? "مادة الميد"
        : resource.target_exam === "final"
        ? "مادة الفاينل"
        : null;

    const isOfficial = options?.isOfficial;

    const mainInfo = (
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {/* Row 1: Badges (Official + Exam Scope) */}
        {(isOfficial || examScopeLabel) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {isOfficial && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 shrink-0">
                <span>⭐</span>
                <span>رسمي</span>
              </span>
            )}
            {examScopeLabel && (
              <span className="rounded-md bg-accent/10 border border-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent shrink-0">
                {examScopeLabel}
              </span>
            )}
          </div>
        )}

        {/* Row 2: Title */}
        <span className="text-sm font-bold text-card-foreground group-hover:text-accent transition-colors line-clamp-2 sm:text-base leading-snug">
          {resource.title}
        </span>

        {/* Row 3: Streamlined Metadata (One tight, clean line) */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
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
          <p className="text-xs text-muted-foreground/80 line-clamp-1 mt-0.5">
            {resource.description}
          </p>
        )}
      </div>
    );

    return (
      <li
        id={`res-${resource.id}`}
        key={resource.id}
        className={`group flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${
          isOfficial
            ? "border-amber-500/35 bg-card shadow-xs hover:border-amber-500/60 hover:shadow-md"
            : "border-border/80 bg-card shadow-xs hover:border-accent/40 hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between gap-2 p-3.5 sm:gap-4 sm:p-4 transition-colors group-hover:bg-secondary/15">
          {/* Main Click Target (Cover + Details) */}
          {isQuiz && !resource.quiz_data ? (
            <button
              type="button"
              onClick={() => setActiveEmbedId(activeEmbedId === resource.id ? null : resource.id)}
              className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 text-start cursor-pointer"
            >
              <ResourceCover resource={resource} isOfficial={isOfficial} />
              {mainInfo}
            </button>
          ) : isPdfReadable ? (
            <button
              type="button"
              onClick={() => setActiveReaderResource(resource)}
              className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 text-start cursor-pointer"
              title="قراءة الملف داخل الموقع"
            >
              <ResourceCover resource={resource} isOfficial={isOfficial} />
              {mainInfo}
            </button>
          ) : isValidResourceUrl(resource.storage_url) ? (
            <a
              href={resource.storage_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 cursor-pointer"
            >
              <ResourceCover resource={resource} isOfficial={isOfficial} />
              {mainInfo}
            </a>
          ) : (
            <div
              className="flex min-w-0 flex-1 items-center gap-3 opacity-60 cursor-not-allowed sm:gap-4"
              title="الملف قيد المعالجة أو التجهيز حالياً"
            >
              <ResourceCover resource={resource} isOfficial={isOfficial} />
              {mainInfo}
            </div>
          )}

          {/* Action Buttons (Bookmark + WhatsApp Share + Download/Open) */}
          <div className="flex items-center gap-1.5 shrink-0 pr-1 sm:pr-2">
            {/* Resource Bookmark Button */}
            <button
              type="button"
              onClick={() => handleToggleSaveResource(resource)}
              aria-pressed={isSaved}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer ${
                isSaved
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/35"
                  : "bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
              title={isSaved ? "إزالة من مواردي المحفوظة" : "حفظ المورد للرجوع السريع"}
              aria-label={isSaved ? "إزالة من المحفوظات" : "حفظ المورد"}
            >
              <BookmarkIcon filled={isSaved} className="h-4 w-4" />
            </button>

            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={() => handleShareResource(resource)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 text-muted-foreground transition-all hover:bg-emerald-500/15 hover:text-emerald-500 hover:scale-105 active:scale-95 shadow-2xs cursor-pointer"
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

            {/* Primary Action Button (Download/Open) */}
            {isQuiz && !resource.quiz_data ? (
              <button
                type="button"
                onClick={() => setActiveEmbedId(activeEmbedId === resource.id ? null : resource.id)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 text-foreground transition-all group-hover:bg-accent group-hover:text-white group-hover:scale-105 shadow-2xs cursor-pointer"
                title="عرض الاختبار"
              >
                <span className="text-xs font-bold">
                  {activeEmbedId === resource.id ? "🔽" : "▶️"}
                </span>
              </button>
            ) : isValidResourceUrl(resource.storage_url) ? (
              <a
                href={resource.storage_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/80 text-foreground transition-all group-hover:bg-accent group-hover:text-white group-hover:scale-105 shadow-2xs"
                title="تحميل / فتح الملف"
              >
                <span className="text-xs font-bold">
                  {resource.type === "link" || resource.type === "other" ? "↗" : "⬇"}
                </span>
              </a>
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/40 text-muted-foreground opacity-60 cursor-not-allowed shadow-2xs"
                title="الملف قيد المعالجة"
              >
                <span className="text-xs">⏳</span>
              </div>
            )}
          </div>
        </div>

        {/* Native Quiz Player (Docked Action Bar inside the same card) */}
        {resource.quiz_data && (
          <div
            id={`quiz-${resource.id}`}
            className="border-t border-border/50 bg-accent/[0.04] px-3.5 py-2.5 sm:px-4 sm:py-3 transition-colors group-hover:bg-accent/[0.08]"
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
          <div className="border-t border-border bg-muted/30 p-4 sm:p-6">
            <iframe
              src={resource.storage_url}
              className="min-h-150 w-full rounded-lg border border-border bg-background shadow-sm"
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
            <span className="text-sm font-medium text-foreground truncate">
              {res.title}
            </span>
            {examScopeLabel && (
              <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {examScopeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
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
        className="flex items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-secondary/30 transition-colors"
      >
        {isPdfReadable ? (
          <button
            type="button"
            onClick={() => setActiveReaderResource(res)}
            className="flex min-w-0 flex-1 items-center cursor-pointer"
            title="قراءة الملف داخل الموقع"
          >
            {infoBody}
          </button>
        ) : (
          infoBody
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleToggleSaveResource(res)}
            aria-pressed={isSaved}
            title={isSaved ? "إزالة من المحفوظات" : "حفظ المورد"}
            aria-label={isSaved ? "إزالة من المحفوظات" : "حفظ المورد"}
            className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
              isSaved
                ? "border-amber-500/40 bg-amber-500/15 text-amber-500"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookmarkIcon filled={isSaved} className="h-3.5 w-3.5" />
          </button>

          {isValidResourceUrl(res.storage_url) ? (
            <a
              href={res.storage_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shrink-0"
            >
              <span>تحميل</span>
              <span>⬇</span>
            </a>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground opacity-60 cursor-not-allowed shrink-0"
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

  return (
    <div className="space-y-10" dir="rtl">
      {/* ─── Shelf 1: 📚 المادة الرسمية / Official Syllabus ────────── */}
      {officialSyllabusResources.length > 0 && (
        <section className="space-y-4" aria-label="المادة الرسمية المعتمدة">
          <div className="border-b border-border pb-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <span>📚</span>
              <span>المادة الرسمية المعتمدة</span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              الخطة الدراسية، كتاب المادة، أو السلايدات الرسمية الصادرة عن الجامعة.
            </p>
          </div>

          <ul className="space-y-3 sm:space-y-3.5 list-none p-0 m-0">
            {officialSyllabusResources.map((r) =>
              renderResourceCard(r, { isOfficial: true })
            )}
          </ul>
        </section>
      )}

      {/* ─── Shelf 2: 🌟 ملخصات ومراجعات ─────────────────────────── */}
      {summaryResources.length > 0 && (
        <section className="space-y-4" aria-label="ملخصات ومراجعات شاملة">
          <div className="border-b border-border pb-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <span>🌟</span>
              <span>ملخصات ومراجعات شاملة</span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              شروحات ومذكرات مركزة تغطي مواضيع الامتحانات مع بنوك أسئلة تفاعلية ذكية.
            </p>
          </div>

          <ul className="space-y-3 sm:space-y-3.5 list-none p-0 m-0">
            {summaryResources.map((r) => renderResourceCard(r))}
          </ul>
        </section>
      )}

      {/* ─── Shelf 3: 📝 أسئلة ونماذج امتحانات ─────────────────────── */}
      {pastExamResources.length > 0 && (
        <section className="space-y-4" aria-label="أسئلة ونماذج امتحانات سابقة">
          <div className="border-b border-border pb-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <span>📝</span>
              <span>أسئلة ونماذج امتحانات سابقة</span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              تجميعات امتحانات السنوات السابقة وأسئلة التدريب للاختبارات النصفية والنهائية.
            </p>
          </div>

          <ul className="space-y-3 sm:space-y-3.5 list-none p-0 m-0">
            {pastExamResources.map((r) => renderResourceCard(r))}
          </ul>
        </section>
      )}

      {/* ─── Shelf 4: 🗂️ أرشيف إضافي ومصادر خارجية (Collapsible) ──── */}
      {archiveResources.length > 0 && (
        <section
          className="rounded-2xl border border-border bg-card/70 overflow-hidden shadow-sm transition-all"
          aria-label="أرشيف إضافي ومصادر خارجية"
        >
          <button
            type="button"
            onClick={() => setIsArchiveOpen(!isArchiveOpen)}
            className="flex w-full items-center justify-between p-4 sm:p-5 text-start hover:bg-secondary/40 transition-colors cursor-pointer"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-foreground text-base sm:text-lg">
                <span>🗂️</span>
                <span>أرشيف إضافي ومصادر خارجية</span>
                <span
                  className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
                  dir="ltr"
                >
                  {archiveResources.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground sm:text-sm">
                سلايدات الفصول المنفردة، شروحات يوتيوب، مراجع إضافية، ومساهمات الطلاب.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-accent hidden sm:inline">
                {isArchiveOpen ? "طي الأرشيف" : "عرض المزيد"}
              </span>
              <span className="rounded-lg bg-secondary p-2 text-xs font-bold text-muted-foreground transition-transform duration-200">
                {isArchiveOpen ? "▲" : "▼"}
              </span>
            </div>
          </button>

          {isArchiveOpen && (
            <div className="border-t border-border bg-background/50 p-4 sm:p-6 space-y-6 animate-in fade-in-50 duration-200">
              {/* Sub-header 1: External Links */}
              {externalLinkResources.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>🔗</span>
                    <span>روابط ومصادر خارجية</span>
                    <span className="text-xs text-muted-foreground font-normal">
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
                            className="opacity-60 cursor-not-allowed flex flex-col justify-between rounded-2xl border border-border bg-card p-4"
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
                              <h5 className="text-sm font-bold text-foreground line-clamp-2">
                                {res.title}
                              </h5>
                              {res.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
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
                          className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:border-accent hover:shadow-md active:scale-[0.99]"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
                              >
                                <span>{meta.icon}</span>
                                <span>{meta.name}</span>
                              </span>
                              <span className="text-xs text-muted-foreground group-hover:text-accent transition-colors">
                                ↗
                              </span>
                            </div>

                            <h5 className="text-sm font-bold text-foreground group-hover:text-accent transition-colors line-clamp-2">
                              {res.title}
                            </h5>

                            {res.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {res.description}
                              </p>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                            <span>فتح المورد الخارجي</span>
                            <span className="font-semibold text-accent">زيارة الموقع ←</span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-header 2: Extra Chapter Slides & Guides */}
              {chapterSlideResources.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>📎</span>
                    <span>سلايدات وفصول إضافية</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({chapterSlideResources.length})
                    </span>
                  </h4>
                  <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                    {chapterSlideResources.map(renderSubduedArchiveRow)}
                  </div>
                </div>
              )}

              {/* Sub-header 3: Student Community Contributions */}
              {studentContributionResources.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>👥</span>
                    <span>مساهمات الطلاب</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({studentContributionResources.length})
                    </span>
                  </h4>
                  <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                    {studentContributionResources.map(renderSubduedArchiveRow)}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ─── Persistent Bottom Crowdsourcing Banner ─────────────────────── */}
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center sm:p-8 backdrop-blur-sm">
        <h4 className="text-base font-bold text-foreground sm:text-lg">
          💡 هل لديك تلخيص أفضل أو أسئلة إضافية؟
        </h4>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm max-w-lg mx-auto leading-relaxed">
          ساهم في إثراء أرشيف المادة وساعد زملاءك في الدفعة على التفوق! يتم مراجعة الملف من قبل فريق المنصة قبل نشره.
        </p>
        <div className="mt-4">
          <Link
            href={`/upload?courseId=${courseId || ""}&title=${encodeURIComponent(`ملخص | ${courseTitle || ""}`)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-90 active:scale-95"
          >
            <span>📤</span>
            <span>شارك ملخصك مع زملائك</span>
          </Link>
        </div>
      </div>

      {/* ─── Lazy-Loaded In-App PDF Reader Modal ────────────────────── */}
      {activeReaderResource && (
        <PdfReaderModal
          key={activeReaderResource.id}
          resource={activeReaderResource}
          isSaved={savedResourceIdSet.has(activeReaderResource.id)}
          onToggleSave={() => handleToggleSaveResource(activeReaderResource)}
          onClose={() => setActiveReaderResource(null)}
          onStartQuiz={handleStartQuizFromReader}
        />
      )}

      {/* ─── Floating Toast Notification ─────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-border/80 bg-foreground text-background px-4 py-2.5 text-xs font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
