"use client";

import { useEffect } from "react";
import BookmarkIcon from "@/components/ui/BookmarkIcon";
import {
  toggleSavedCourse,
  syncSavedCourseMeta,
  useBookmarks,
} from "@/lib/bookmarks";
import { track } from "@/lib/analytics";

interface CoursePinButtonProps {
  courseId?: string;
  courseSlug: string;
  courseTitle: string;
  courseCode?: string | null;
}

/**
 * Client-side pin toggle rendered inside Server Component course headers
 * so students can save a course to their Header "محفوظاتي" drawer.
 */
export default function CoursePinButton({
  courseId,
  courseSlug,
  courseTitle,
  courseCode,
}: CoursePinButtonProps) {
  const { courses } = useBookmarks();
  const isPinned = courses.includes(courseSlug);

  // Keep cached Arabic title & code up-to-date for courses pinned before metadata caching
  useEffect(() => {
    if (isPinned) {
      syncSavedCourseMeta([{ slug: courseSlug, title: courseTitle, courseCode }]);
    }
  }, [isPinned, courseSlug, courseTitle, courseCode]);

  return (
    <button
      type="button"
      onClick={() => {
          const nowPinned = toggleSavedCourse(courseSlug, {
            title: courseTitle,
            courseCode,
          });
          // Track course pin/unpin — reveals which courses students care about most
          track({
            eventType: nowPinned ? "course_pin" : "course_unpin",
            courseId,
            courseSlug,
            metadata: {
              source: "course_header",
              course_title: courseTitle,
            },
          });
        }}
      aria-pressed={isPinned}
      title={isPinned ? "إزالة من مقرراتي المحفوظة" : "حفظ المادة في مقرراتي"}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 shadow-2xs cursor-pointer ${
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

