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
 * Architectural notes:
 * - Must render into document.body via createPortal because Header.tsx uses
 *   `backdrop-blur-sm` (`backdrop-filter`), which CSS turns into a containing block
 *   for `position: fixed` children (trapping non-portaled drawers inside the 64px header).
 * - Anchored on the physical left edge (`left-0`, matching the RTL inline-end navbar
 *   trigger) and shifted offscreen with `-translate-x-full` + `invisible` when closed.
 *   Note: Using `translate-x-full` (+100%) on a `left-0` drawer slides it INTO the screen!
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
  const isEmpty = totalCount === 0;

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
        className={`fixed inset-y-0 left-0 z-[70] flex h-dvh w-[90vw] max-w-sm flex-col border-r border-border bg-card shadow-2xl transition-[transform,visibility] duration-300 ease-out ${
          isOpen
            ? "visible translate-x-0 pointer-events-auto"
            : "invisible -translate-x-full pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2">
            <BookmarkIcon filled className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-foreground">محفوظاتي</h2>
            {totalCount > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-500">
                {totalCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المحفوظات"
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-border bg-secondary/40 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-secondary/40 text-3xl">
                🔖
              </div>
              <div className="space-y-2">
                <p className="text-base font-bold text-foreground">
                  لا توجد محفوظات بعد
                </p>
                <p className="mx-auto max-w-[240px] text-xs leading-relaxed text-muted-foreground">
                  اضغط على أيقونة الحفظ بجانب أي مقرر أو ملخص لإضافته هنا والوصول إليه بسرعة
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-1 rounded-xl border border-border bg-secondary/60 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                تصفح المواد
              </button>
            </div>
          ) : (
            <>
              {/* Pinned Courses */}
              {savedCourseSlugs.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <span>📌</span>
                    <span>مقرراتي المحفوظة</span>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                      {savedCourseSlugs.length}
                    </span>
                  </h3>

                  <ul className="space-y-2">
                    {savedCourseSlugs.map((slug) => {
                      const meta = courseMeta[slug];
                      const displayTitle =
                        meta?.title || formatFallbackSlug(slug);

                      return (
                        <li key={slug}>
                          <div className="group flex items-center gap-2 rounded-xl border border-border bg-secondary/30 ps-3 pe-1.5 py-2 hover:border-accent/50 hover:bg-secondary/60 transition-colors">
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
                              className="flex min-w-0 flex-1 items-center gap-2.5 py-0.5"
                            >
                              <span className="shrink-0 text-base">📚</span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground group-hover:text-accent">
                                  {displayTitle}
                                </p>
                                {meta?.courseCode && (
                                  <p className="font-mono text-[10px] text-muted-foreground">
                                    {meta.courseCode}
                                  </p>
                                )}
                              </div>
                            </Link>
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
                              className="flex h-10 w-10 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-amber-500 hover:bg-secondary active:scale-95 transition-all cursor-pointer"
                            >
                              <BookmarkIcon filled className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Saved Resources */}
              {savedResources.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <span>🔖</span>
                    <span>مواردي المحفوظة</span>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                      {savedResources.length}
                    </span>
                  </h3>

                  <ul className="space-y-2">
                    {savedResources.map((res) => (
                      <li key={res.id}>
                        <div className="group flex items-center gap-2 rounded-xl border border-border bg-secondary/30 ps-3 pe-1.5 py-2 hover:border-accent/50 hover:bg-secondary/60 transition-colors">
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
                            className="flex min-w-0 flex-1 items-center gap-2.5 py-0.5"
                          >
                            <span className="shrink-0 text-base">
                              {getResourceTypeIcon(res.type)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground group-hover:text-accent">
                                {res.title}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {res.courseTitle}
                                {res.hasQuiz ? " • ✨ كويز" : ""}
                              </p>
                            </div>
                          </Link>
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
                            className="flex h-10 w-10 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-xs text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
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
        aria-label="محفوظاتي"
        aria-expanded={isOpen}
        title="محفوظاتي"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-all hover:border-accent/60 hover:text-accent active:scale-95 cursor-pointer"
      >
        <BookmarkIcon filled={isHydrated && totalCount > 0} className="h-5 w-5" />

        {isHydrated && totalCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[9px] font-bold text-white shadow-xs"
          >
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      <BookmarkDrawer isOpen={isOpen} onClose={handleClose} />
    </>
  );
}
