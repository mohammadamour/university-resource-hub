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
 * Styling uses new design-system tokens: bg-btn/bg-surface, border-ink, text-btn-ink.
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
      className={`inline-flex min-h-[50px] shrink-0 items-center gap-2 rounded-[15px] border-[1.5px] px-5 text-sm font-semibold transition-all active:scale-95 cursor-pointer ${
        isPinned
          ? "border-transparent bg-btn text-btn-ink hover:opacity-90"
          : "border-ink bg-surface text-ink hover:bg-line/40"
      }`}
    >
      <BookmarkIcon filled={isPinned} className="h-4 w-4" />
      <span>{isPinned ? "في مقرراتي" : "حفظ المادة"}</span>
    </button>
  );
}
