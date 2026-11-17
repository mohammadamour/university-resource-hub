"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  useBookmarks,
  toggleSavedCourse,
  removeSavedResource,
} from "@/lib/bookmarks";
import type { ResourceType } from "@/types/database";
import BookmarkIcon from "@/components/ui/BookmarkIcon";
import { track } from "@/lib/analytics";
import { getCourseHueStyles } from "@/lib/design-hues";

const emptySubscribe = () => () => {};

/**
 * SSR-safe hydration flag without triggering React 19 set-state-in-effect warnings.
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function getResourceTypeIcon(type: ResourceType): string {
  switch (type) {
    case "summary":
      return "📄";
    case "past_exam":
      return "📝";
    case "quiz":
      return "✨";
    case "guide":
      return "📖";
    case "link":
      return "🔗";
    default:
      return "📎";
  }
}

function formatFallbackSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * BookmarkDrawer — slide-over panel listing pinned courses and saved resources.
 *
 * Warm Parchment Design System (2026 Redesign):
 * - Uses segmented pill controls for switching between [المواد] and [الملفات].
 * - Dynamically renders course covers with deterministic pastel hues (getCourseHueStyles).
 * - Must render into document.body via createPortal because Header.tsx uses
 *   `backdrop-blur-sm` (`backdrop-filter`), which CSS turns into a containing block
 *   for `position: fixed` children (trapping non-portaled drawers inside the 64px header).
 * - Anchored on the physical left edge (`left-0`, matching the RTL inline-end navbar
 *   trigger) and shifted offscreen with `-translate-x-full` + `invisible` when closed.
 */
export function BookmarkDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const isHydrated = useIsHydrated();
  const {
    courses: savedCourseSlugs,
    courseMeta,
    resources: savedResources,
  } = useBookmarks();

  const [activeTab, setActiveTab] = useState<"courses" | "files">("courses");

  // If a student only has saved resources and no saved courses, auto-switch to files tab
  useEffect(() => {
    if (savedCourseSlugs.length === 0 && savedResources.length > 0) {
      setActiveTab("files");
    }
  }, [savedCourseSlugs.length, savedResources.length]);

  // Lock background scroll while drawer is open (mobile critical — prevents background scroll bleed)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isHydrated) return null;

  const totalCount = savedCourseSlugs.length + savedResources.length;

  return createPortal(
    <>
      {/* Backdrop — higher z-index than sticky z-50 Header */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs transition-[opacity,visibility] duration-300 ${
          isOpen
            ? "visible opacity-100 pointer-events-auto"
            : "invisible opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer Panel — slides cleanly from physical left edge (end-0 in RTL) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        aria-label="محفوظاتي"
        dir="rtl"
        className={`fixed inset-y-0 left-0 z-[70] flex h-dvh w-[92vw] max-w-sm sm:max-w-md flex-col border-r border-line bg-paper text-ink shadow-2xl transition-[transform,visibility] duration-300 ease-out ${
          isOpen
            ? "visible translate-x-0 pointer-events-auto"
            : "invisible -translate-x-full pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface/80 px-4 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink">محفوظاتي</h2>
            {totalCount > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-hi px-2 font-mono text-xs font-bold text-ink shadow-xs">
                {totalCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المحفوظات"
            className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-[14px] border border-line bg-surface text-sm font-bold text-muted hover:border-ink/40 hover:text-ink active:scale-95 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="shrink-0 px-4 pt-3.5 pb-2">
          <div
            role="tablist"
            aria-label="نوع المحفوظات"
            className="flex gap-1.5 p-1 rounded-2xl border border-line/70 bg-ink/5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "courses"}
              onClick={() => setActiveTab("courses")}
              className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "courses"
                  ? "bg-btn text-btn-ink shadow-xs"
                  : "bg-transparent text-ink hover:text-ink/80"
              }`}
            >
              <span>المواد</span>
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-mono ${
                  activeTab === "courses" ? "bg-btn-ink/20 text-btn-ink" : "bg-ink/10 text-muted"
                }`}
              >
                {savedCourseSlugs.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "files"}
              onClick={() => setActiveTab("files")}
              className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "files"
                  ? "bg-btn text-btn-ink shadow-xs"
                  : "bg-transparent text-ink hover:text-ink/80"
              }`}
            >
              <span>الملفات</span>
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-mono ${
                  activeTab === "files" ? "bg-btn-ink/20 text-btn-ink" : "bg-ink/10 text-muted"
                }`}
              >
                {savedResources.length}
              </span>
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4">
          {/* ─── COURSES TAB ─── */}
          {activeTab === "courses" && (
            <>
              {savedCourseSlugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3.5 py-14 text-center">
                  <div
                    aria-hidden="true"
                    className="relative flex h-18 w-14 items-center justify-center rounded-xl border border-line bg-surface shadow-md"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to bottom, transparent 0, transparent 9px, rgba(27,31,42,0.06) 9px, rgba(27,31,42,0.06) 10px)",
                    }}
                  >
                    <span className="font-heading text-2xl font-bold text-muted">م</span>
                    <span
                      className="absolute -top-1.5 -end-1 h-6 w-3.5 bg-hi"
                      style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)" }}
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading text-lg font-bold text-ink">
                      ما حفظت أي مادة بعد
                    </h3>
                    <p className="mx-auto max-w-[240px] text-xs leading-relaxed text-muted">
                      اضغط على علامة الحفظ بجانب أي مقرر دراسي لتثبيته هنا والوصول إليه بسرعة
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-1 rounded-xl bg-btn px-4 py-2.5 text-xs font-bold text-btn-ink transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                  >
                    تصفح كل المواد
                  </button>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {savedCourseSlugs.map((slug) => {
                    const meta = courseMeta[slug];
                    const displayTitle = meta?.title || formatFallbackSlug(slug);
                    const hueStyles = getCourseHueStyles(slug);
                    const initialLetter = displayTitle.trim().charAt(0) || "م";

                    return (
                      <li key={slug}>
                        <div className="group relative flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-2.5 sm:p-3 hover:border-ink/30 hover:shadow-xs transition-all">
                          <Link
                            href={`/courses/${slug}`}
                            onClick={() => {
                              track({
                                eventType: "saved_course_open",
                                courseSlug: slug,
                                metadata: { source: "bookmark_drawer" },
                              });
                              onClose();
                            }}
                            className="flex min-w-0 flex-1 items-center gap-3"
                          >
                            {/* Mini Notebook Cover */}
                            <div
                              aria-hidden="true"
                              className="relative flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line/60"
                              style={{
                                backgroundColor: hueStyles.tint,
                                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 8px, rgba(27,31,42,0.08) 8px, rgba(27,31,42,0.08) 9px)`,
                              }}
                            >
                              <span
                                className="font-heading text-2xl font-bold leading-none select-none"
                                style={{ color: hueStyles.deep }}
                              >
                                {initialLetter}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                dir="auto"
                                className="truncate font-heading text-sm sm:text-base font-bold text-ink group-hover:text-ink/80"
                              >
                                {displayTitle}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-muted">
                                {meta?.courseCode ? `${meta.courseCode} • ` : ""}
                                مقرر دراسي
                              </p>
                            </div>
                          </Link>

                          {/* Remove from Saved */}
                          <button
                            type="button"
                            onClick={() => {
                              toggleSavedCourse(slug);
                              track({
                                eventType: "course_unpin",
                                courseSlug: slug,
                                metadata: {
                                  source: "drawer",
                                  course_title: displayTitle,
                                },
                              });
                            }}
                            aria-label={`إلغاء حفظ ${displayTitle}`}
                            title="إلغاء الحفظ"
                            className="flex h-11 w-11 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-hi text-ink hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                          >
                            <BookmarkIcon filled className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {/* ─── FILES TAB ─── */}
          {activeTab === "files" && (
            <>
              {savedResources.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3.5 py-14 text-center">
                  <div
                    aria-hidden="true"
                    className="relative flex h-18 w-14 items-center justify-center rounded-xl border border-line bg-surface shadow-md"
                  >
                    <span className="text-2xl">📄</span>
                    <span
                      className="absolute -top-1.5 -end-1 h-6 w-3.5 bg-hi"
                      style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)" }}
                    />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading text-lg font-bold text-ink">
                      ما حفظت أي ملف بعد
                    </h3>
                    <p className="mx-auto max-w-[240px] text-xs leading-relaxed text-muted">
                      اضغط على علامة الحفظ بجانب أي ملخص أو امتحان لترجع له بسرعة وقت الامتحانات
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-1 rounded-xl bg-btn px-4 py-2.5 text-xs font-bold text-btn-ink transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                  >
                    تصفح المقررات
                  </button>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {savedResources.map((res) => (
                    <li key={res.id}>
                      <div className="group relative flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-2.5 sm:p-3 hover:border-ink/30 hover:shadow-xs transition-all">
                        <Link
                          href={`/courses/${res.courseSlug}?res=${encodeURIComponent(res.id)}#res-${res.id}`}
                          onClick={() => {
                            track({
                              eventType: "saved_resource_open",
                              resourceId: res.id,
                              courseSlug: res.courseSlug,
                              resourceTitle: res.title,
                              metadata: { source: "bookmark_drawer" },
                            });
                            onClose();
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          {/* Mini Document Icon Box */}
                          <div
                            aria-hidden="true"
                            className="flex h-12 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-paper text-xl shadow-2xs"
                          >
                            {getResourceTypeIcon(res.type)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              dir="auto"
                              className="truncate text-xs sm:text-sm font-bold text-ink group-hover:text-ink/80"
                            >
                              {res.title}
                            </p>
                            <p dir="auto" className="mt-0.5 truncate text-[11px] text-muted">
                              <span>{res.courseTitle}</span>
                              {res.targetExam === "midterm" && " • مادة الميد"}
                              {res.targetExam === "final" && " • مادة الفاينل"}
                              {res.hasQuiz && " • ✨ كويز"}
                            </p>
                          </div>
                        </Link>

                        {/* Remove from Saved */}
                        <button
                          type="button"
                          onClick={() => {
                            removeSavedResource(res.id);
                            track({
                              eventType: "bookmark_remove",
                              resourceId: res.id,
                              courseSlug: res.courseSlug,
                              resourceTitle: res.title,
                              metadata: { source: "drawer" },
                            });
                          }}
                          aria-label={`إزالة ${res.title} من المحفوظات`}
                          title="إزالة من المحفوظات"
                          className="flex h-11 w-11 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-muted hover:border-ink/40 hover:text-ink active:scale-95 transition-all cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* Academic Trust Notice */}
          <div className="pt-3">
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted bg-ink/[0.03] p-3 rounded-xl border border-line/50">
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 mt-0.5"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
              <span>المحفوظات تبقى على هذا المتصفح فقط بدون تسجيل دخول، ولا تضيع مع تحديث الصفحة.</span>
            </p>
          </div>
        </div>
      </aside>
    </>,
    document.body
  );
}

/**
 * BookmarkDrawerButton — navbar trigger rendered inside Header.tsx.
 * Keeps Header.tsx a Server Component by isolating client state & portal here.
 */
export function BookmarkDrawerButton() {
  const [isOpen, setIsOpen] = useState(false);
  const isHydrated = useIsHydrated();
  const { courses, resources } = useBookmarks();

  const totalCount = courses.length + resources.length;
  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`المحفوظات (${isHydrated ? totalCount : 0})`}
        aria-expanded={isOpen}
        title="المحفوظات"
        className="relative inline-flex h-[46px] w-[46px] items-center justify-center rounded-[14px] border border-line bg-surface text-ink transition-all hover:border-ink/40 active:scale-95 cursor-pointer p-0"
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={isHydrated && totalCount > 0 ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
        </svg>

        {isHydrated && totalCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -end-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-[10px] bg-hi px-1 font-mono text-[11px] font-bold text-ink shadow-xs"
          >
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      <BookmarkDrawer isOpen={isOpen} onClose={handleClose} />
    </>
  );
}
