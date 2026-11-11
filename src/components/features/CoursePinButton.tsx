"use client";

import BookmarkIcon from "@/components/ui/BookmarkIcon";
import { toggleSavedCourse, useBookmarks } from "@/lib/bookmarks";

interface CoursePinButtonProps {
  courseSlug: string;
}

/**
 * Client-side pin toggle rendered inside Server Component course headers
 * so students can save a course to their homepage "مقرراتي المحفوظة" strip.
 */
export default function CoursePinButton({ courseSlug }: CoursePinButtonProps) {
  const { courses } = useBookmarks();
  const isPinned = courses.includes(courseSlug);

  return (
    <button
      type="button"
      onClick={() => toggleSavedCourse(courseSlug)}
      aria-pressed={isPinned}
      title={isPinned ? "إزالة من مقرراتي المحفوظة" : "حفظ المادة في مقرراتي"}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer ${
        isPinned
          ? "border-amber-500/40 bg-amber-500/15 text-amber-500 hover:bg-amber-500/20"
          : "border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground"
      }`}
    >
      <BookmarkIcon filled={isPinned} className="h-3.5 w-3.5" />
      <span>{isPinned ? "في مقرراتي" : "حفظ المادة"}</span>
    </button>
  );
}

