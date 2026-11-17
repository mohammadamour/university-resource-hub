"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  DepartmentWithCourses,
  CourseWithResources,
} from "@/types/database";
import Card, { CardBadge } from "@/components/ui/Card";
import {
  useBookmarks,
  toggleSavedCourse,
  syncSavedCourseMeta,
} from "@/lib/bookmarks";
import { track } from "@/lib/analytics";

function buildCourseBadges(course: CourseWithResources): CardBadge[] {
  const activeResources = (course.resources || []).filter(
    (r) => (r.status || "active") === "active"
  );
  const studyCount = activeResources.filter((r) => r.type !== "quiz").length;
  const quizResources = activeResources.filter(
    (r) => r.quiz_data && r.quiz_data.questions && r.quiz_data.questions.length > 0
  );
  const quizCount = quizResources.length;
  const totalQuestions = quizResources.reduce(
    (sum, r) => sum + (r.quiz_data?.questions?.length || 0),
    0
  );

  const badges: CardBadge[] = [];
  if (studyCount > 0) {
    badges.push({
      text: `${studyCount} ${studyCount === 1 ? "ملخص" : "ملخصات"}`,
      variant: "accent",
      icon: "📄",
    });
  }
  if (quizCount > 0) {
    badges.push({
      text: `${quizCount} كويز • ${totalQuestions} س`,
      variant: "emerald",
      icon: "✨",
    });
  }
  if (studyCount === 0 && quizCount === 0) {
    badges.push({
      text: "قيد الإعداد ⏳",
      variant: "muted",
    });
  }
  return badges;
}

interface DepartmentGridProps {
  departments: DepartmentWithCourses[];
}

/**
 * Checks whether the slug corresponds to the IT department.
 * Uses exact match or prefix to avoid false positives like "university-requirements".
 */
function isItDepartment(slug: string): boolean {
  return slug === "it" || slug === "it-department" || slug.startsWith("it-");
}

/**
 * Checks whether the slug corresponds to University Requirements.
 */
function isRequirementsDepartment(slug: string): boolean {
  return slug === "university-requirements" || slug.includes("requirement");
}

/**
 * Checks whether the slug corresponds to University Electives / Other.
 */
function isElectivesDepartment(slug: string): boolean {
  return slug === "university-electives" || slug.includes("elective") || slug === "other";
}

/**
 * Returns an appropriate emoji icon based on department slug.
 */
function getDepartmentIcon(slug: string): string {
  if (isItDepartment(slug)) return "💻";
  if (isRequirementsDepartment(slug)) return "🏛️";
  if (isElectivesDepartment(slug)) return "🌟";
  if (slug === "placement-exams") return "📝";
  return "📚";
}

/**
 * Returns a concise Arabic label for segment switcher buttons.
 */
function getDepartmentShortLabel(dept: DepartmentWithCourses): string {
  if (isItDepartment(dept.slug)) return "مواد IT";
  if (isRequirementsDepartment(dept.slug)) return "إجباري جامعة";
  if (isElectivesDepartment(dept.slug)) return "اختياري جامعة / أخرى";
  if (dept.slug === "placement-exams") return "امتحانات المستوى";
  return dept.name;
}

/**
 * Sorts courses within a department:
 * Courses with active resources/quizzes surface first, sorted alphabetically in Arabic.
 */
function sortCourses(courses: CourseWithResources[]) {
  return [...(courses || [])].sort((a, b) => {
    const aActive = (a.resources || []).filter(
      (r) => (r.status || "active") === "active"
    ).length;
    const bActive = (b.resources || []).filter(
      (r) => (r.status || "active") === "active"
    ).length;
    if (aActive > 0 && bActive === 0) return -1;
    if (aActive === 0 && bActive > 0) return 1;
    return a.title.localeCompare(b.title, "ar");
  });
}

/**
 * DepartmentGrid Component
 *
 * Features:
 * 1. Default unfiltered state: shows all departments when first opening the site.
 * 2. Toggleable segment buttons: click to filter, click again to remove filter.
 * 3. Accurate labels: "مواد IT" (💻) and "إجباري جامعة" (🏛️).
 * 4. Course quick-jump selector: grouped by department when unfiltered, single department when filtered.
 * 5. High-density 2-column mobile course grid.
 */
export default function DepartmentGrid({ departments }: DepartmentGridProps) {
  const router = useRouter();

  // Placement exams feature flag
  const SHOW_PLACEMENT_EXAMS =
    process.env.NEXT_PUBLIC_SHOW_PLACEMENT_EXAMS === "true";

  // Filter visible departments according to business rules:
  // Only display courses that have at least one active resource so the homepage looks bustling and populated.
  // Empty courses remain hidden until at least one resource is uploaded to them.
  const visibleDepartments = useMemo(() => {
    return departments
      .map((dept) => ({
        ...dept,
        courses: (dept.courses || []).filter((course) =>
          (course.resources || []).some(
            (r) => (r.status || "active") === "active"
          )
        ),
      }))
      .filter(
        (dept) =>
          (SHOW_PLACEMENT_EXAMS || dept.slug !== "placement-exams") &&
          dept.slug !== "english" &&
          (dept.courses.length > 0 || dept.slug === "placement-exams")
      );
  }, [departments, SHOW_PLACEMENT_EXAMS]);

  // Reactive localStorage bookmarks (SSR-safe via useSyncExternalStore).
  // Only the slug set is needed here — savedResources and savedCourses lists
  // are rendered in BookmarkDrawer (Header), not on the homepage.
  const { courses: savedCourseSlugs } = useBookmarks();

  const savedCourseSlugSet = useMemo(
    () => new Set(savedCourseSlugs),
    [savedCourseSlugs]
  );

  // Backfill Arabic titles & codes for any pinned slugs saved before metadata caching
  useEffect(() => {
    if (savedCourseSlugs.length === 0) return;
    const flatCatalog = visibleDepartments.flatMap((dept) =>
      (dept.courses || []).map((course) => ({
        slug: course.slug,
        title: course.title,
        courseCode: course.course_code,
      }))
    );
    syncSavedCourseMeta(flatCatalog);
  }, [savedCourseSlugs, visibleDepartments]);

  // Initially null: no filter applied on first visit
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);

  // Active department object if a filter is active
  const activeDept = useMemo(() => {
    if (!activeDeptId) return null;
    return visibleDepartments.find((d) => d.id === activeDeptId) || null;
  }, [visibleDepartments, activeDeptId]);

  // Departments to render: either the single active department or all departments
  const departmentsToRender = useMemo(() => {
    if (activeDept) return [activeDept];
    return visibleDepartments;
  }, [activeDept, visibleDepartments]);

  // Total count of courses across all visible departments
  const totalCoursesCount = useMemo(() => {
    return visibleDepartments.reduce(
      (sum, dept) => sum + (dept.courses?.length || 0),
      0
    );
  }, [visibleDepartments]);

  if (visibleDepartments.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          لا توجد أقسام متاحة حالياً. ترقبوا التحديثات! 🚀
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* ─── 1. Filter Tab Pills ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3.5">
        <div
          role="tablist"
          aria-label="أقسام المواد الدراسية"
          className="flex flex-wrap gap-2 sm:gap-2.5"
        >
          {visibleDepartments.map((dept) => {
            const isActive = dept.id === activeDeptId;
            const label = getDepartmentShortLabel(dept);
            const count = dept.courses.length;

            return (
              <button
                key={dept.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  const isClearing = activeDeptId === dept.id;
                  setActiveDeptId((prev) => (prev === dept.id ? null : dept.id));
                  track({
                    eventType: "department_filter",
                    metadata: {
                      department_slug: dept.slug,
                      action: isClearing ? "clear" : "select",
                    },
                  });
                }}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs sm:text-[15px] font-semibold transition-all cursor-pointer border-[1.5px] ${
                  isActive
                    ? "bg-btn text-btn-ink border-btn shadow-sm"
                    : "bg-surface text-ink border-line hover:border-ink/40"
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={`min-w-[22px] h-[22px] rounded-full px-1.5 text-[11.5px] flex items-center justify-center font-semibold ${
                      isActive
                        ? "bg-white/18 text-btn-ink"
                        : "bg-black/[0.06] text-muted"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── 2. Direct Course Selector Dropdown ─────────────────────────────── */}
        {totalCoursesCount > 0 && (
          <div className="w-full max-w-md">
            <label htmlFor="course-quick-select" className="sr-only">
              اختر مادة للانتقال السريع
            </label>
            <div className="relative">
              <select
                id="course-quick-select"
                value=""
                onChange={(e) => {
                  const targetUrl = e.target.value;
                  if (targetUrl) {
                    const courseSlug = targetUrl.replace(/^\/courses\//, "");
                    track({
                      eventType: "quick_select_course",
                      courseSlug,
                      metadata: { source: "homepage_dropdown" },
                    });
                    router.push(targetUrl);
                  }
                }}
                className="w-full appearance-none rounded-[14px] border border-line bg-surface px-4 py-2.5 pe-9 ps-9 text-sm font-medium text-ink shadow-xs transition-all hover:border-ink/40 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 cursor-pointer"
              >
                <option value="" disabled>
                  {activeDept
                    ? `اختر مادة من ${getDepartmentShortLabel(activeDept)} (${activeDept.courses.length} مادة)...`
                    : `اختر مادة للانتقال المباشر (${totalCoursesCount} مادة)...`}
                </option>
                {activeDept ? (
                  sortCourses(activeDept.courses).map((course) => (
                    <option key={course.id} value={`/courses/${course.slug}`}>
                      {course.title}{" "}
                      {course.course_code ? `(${course.course_code})` : ""}
                    </option>
                  ))
                ) : (
                  visibleDepartments.map((dept) => (
                    <optgroup key={dept.id} label={dept.name}>
                      {sortCourses(dept.courses).map((course) => (
                        <option key={course.id} value={`/courses/${course.slug}`}>
                          {course.title}{" "}
                          {course.course_code ? `(${course.course_code})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>

              {/* Leading search icon (inline-end in RTL = right) */}
              <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
                </svg>
              </div>

              {/* Trailing chevron (inline-start in RTL = left) */}
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-muted">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. Department Sections ───────────────────────────────────────────── */}
      <div className="space-y-10">
        {departmentsToRender.map((dept) => {
          const sorted = sortCourses(dept.courses);
          const deptLabel = getDepartmentShortLabel(dept);

          return (
            <section key={dept.id} className="space-y-4">
              {/* Section Header */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-heading text-[26px] sm:text-[30px] font-bold text-ink leading-tight">
                    {dept.name}
                  </h2>
                  <p className="mt-1 text-sm sm:text-[15px] text-muted">
                    {dept.slug === "placement-exams"
                      ? "نماذج ومواد تدريبية لجميع امتحانات الكفاءة"
                      : `${dept.courses.length} مادة دراسية متاحة`}
                  </p>
                </div>
                {activeDeptId && (
                  <button
                    type="button"
                    onClick={() => setActiveDeptId(null)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted hover:border-ink/30 hover:text-ink transition-colors cursor-pointer"
                  >
                    <span>✕</span>
                    <span>عرض الكل</span>
                  </button>
                )}
              </div>

              {/* Course Grid */}
              {dept.slug === "placement-exams" ? (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3">
                  <Card
                    key="mock-placement"
                    href="/courses/placement-exams"
                    slug="placement-exams"
                    title="امتحانات المستوى"
                    courseCode={null}
                    departmentLabel="امتحانات"
                    description="نماذج ومواد تحضيرية لجميع امتحانات الكفاءة (عربي، إنجليزي، حاسوب)"
                  />
                </div>
              ) : sorted.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3">
                  {sorted.map((course) => (
                    <Card
                      key={course.id}
                      href={`/courses/${course.slug}`}
                      slug={course.slug}
                      title={course.title}
                      courseCode={course.course_code}
                      departmentLabel={deptLabel}
                      badges={buildCourseBadges(course)}
                      isPinned={savedCourseSlugSet.has(course.slug)}
                      onTogglePin={() => {
                        const nowPinned = toggleSavedCourse(course.slug, {
                          title: course.title,
                          courseCode: course.course_code,
                        });
                        track({
                          eventType: nowPinned ? "course_pin" : "course_unpin",
                          courseId: course.id,
                          courseSlug: course.slug,
                          metadata: {
                            source: "homepage_card",
                            course_title: course.title,
                          },
                        });
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line p-8 text-center bg-surface/40">
                  <p className="text-sm text-muted">
                    قريباً — يتم تجهيز المحتوى لهذا القسم ✨
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
