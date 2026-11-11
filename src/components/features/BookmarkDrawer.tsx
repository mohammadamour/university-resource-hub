"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  useBookmarks,
  toggleSavedCourse,
  removeSavedResource,
} from "@/lib/bookmarks";
import type { ResourceType } from "@/types/database";
import BookmarkIcon from "@/components/ui/BookmarkIcon";

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

/**
 * BookmarkDrawer — slide-over panel (from inline-end / right in RTL) that lists
 * the student's pinned courses and saved resources from localStorage.
 *
 * Renders as a fixed full-screen overlay on mobile; a narrower side panel on sm+.
 * Body scroll is locked while open. Escape key and backdrop click both close it.
 */
export function BookmarkDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { courses: savedCourseSlugs, resources: savedResources } =
    useBookmarks();

  // Lock background scroll while drawer is open (mobile critical — prevents content shift)
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

  const totalCount = savedCourseSlugs.length + savedResources.length;
  const isEmpty = totalCount === 0;

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────────
          Fades in when drawer opens. Click closes the drawer. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ── Drawer Panel ──────────────────────────────────────────────────────
          Slides in from inline-end (right edge in RTL). Full-width on mobile,
          capped at sm:max-w-sm on larger screens. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="محفوظاتي"
        dir="rtl"
        className={`fixed inset-y-0 end-0 z-50 flex w-full flex-col bg-card shadow-2xl transition-transform duration-300 ease-in-out sm:max-w-sm ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔖</span>
            <h2 className="text-base font-bold text-foreground">محفوظاتي</h2>
            {totalCount > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                {totalCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المحفوظات"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-6">
          {isEmpty ? (
            /* ── Empty State ──────────────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="text-5xl">📌</div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  لا توجد محفوظات بعد
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">
                  اضغط على 🔖 بجانب أي ملخص أو مادة لحفظه هنا للوصول السريع
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Pinned Courses ──────────────────────────────────────── */}
              {savedCourseSlugs.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <span>📌</span>
                    <span>مقرراتي المحفوظة</span>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] normal-case tracking-normal">
                      {savedCourseSlugs.length}
                    </span>
                  </h3>

                  <ul className="space-y-2">
                    {savedCourseSlugs.map((slug) => (
                      <li key={slug}>
                        <div className="group flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2.5 hover:border-accent/50 hover:bg-secondary/60 transition-colors">
                          <Link
                            href={`/courses/${slug}`}
                            onClick={onClose}
                            className="flex min-w-0 flex-1 items-center gap-2"
                          >
                            <span className="text-base">💻</span>
                            <span className="truncate text-sm font-semibold text-foreground group-hover:text-accent">
                              {/* Slug displayed directly — real title would need a lookup;
                                  for now it's readable enough and avoids a DB query. */}
                              {slug
                                .replace(/-/g, " ")
                                .replace(/\b\w/g, (c) => c.toUpperCase())}
                            </span>
                          </Link>
                          {/* Unpin button */}
                          <button
                            type="button"
                            onClick={() => toggleSavedCourse(slug)}
                            aria-label={`إلغاء حفظ ${slug}`}
                            title="إلغاء الحفظ"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          >
                            <BookmarkIcon filled className="h-4 w-4 text-amber-500" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ── Saved Resources ─────────────────────────────────────── */}
              {savedResources.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <span>🔖</span>
                    <span>ملخصاتي المحفوظة</span>
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] normal-case tracking-normal">
                      {savedResources.length}
                    </span>
                  </h3>

                  <ul className="space-y-2">
                    {savedResources.map((res) => (
                      <li key={res.id}>
                        <div className="group flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2.5 hover:border-accent/50 hover:bg-secondary/60 transition-colors">
                          <Link
                            href={`/courses/${res.courseSlug}?res=${encodeURIComponent(res.id)}#res-${res.id}`}
                            onClick={onClose}
                            className="flex min-w-0 flex-1 items-center gap-2.5"
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
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeSavedResource(res.id)}
                            aria-label={`إزالة ${res.title} من المحفوظات`}
                            title="إزالة من المحفوظات"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
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
      </div>
    </>
  );
}

/**
 * BookmarkDrawerButton — the trigger that lives in the site Header nav.
 *
 * Keeps Header.tsx as a Server Component by isolating all client-side state
 * (drawer open/close, bookmark count badge) into this tiny client leaf.
 */
export function BookmarkDrawerButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { courses, resources } = useBookmarks();

  // Avoid hydration mismatch: don't render count badge on the server.
  // It flashes in after mount, which is fine for a cosmetic badge.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totalCount = courses.length + resources.length;
  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="المحفوظات"
        title="محفوظاتي"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-all hover:border-accent/60 hover:text-accent active:scale-95 cursor-pointer"
      >
        <BookmarkIcon filled={mounted && totalCount > 0} className="h-5 w-5" />

        {/* Badge — only shown after hydration and when at least one item is saved */}
        {mounted && totalCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white"
          >
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      <BookmarkDrawer isOpen={isOpen} onClose={handleClose} />
    </>
  );
}

