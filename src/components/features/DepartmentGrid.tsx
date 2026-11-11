"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type {
  DepartmentWithCourses,
  CourseWithResources,
} from "@/types/database";
import Card, { CardBadge } from "@/components/ui/Card";
import { useBookmarks, toggleSavedCourse } from "@/lib/bookmarks";

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
 * Returns an appropriate emoji icon based on department slug.
 */
function getDepartmentIcon(slug: string): string {
  if (isItDepartment(slug)) return "💻";
  if (isRequirementsDepartment(slug)) return "🏛️";
  if (slug === "placement-exams") return "📝";
  return "📚";
}

/**
 * Returns a concise Arabic label for segment switcher buttons.
 */
function getDepartmentShortLabel(dept: DepartmentWithCourses): string {
  if (isItDepartment(dept.slug)) return "مواد IT";
  if (isRequirementsDepartment(dept.slug)) return "إجباري جامعة";
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
  // are now rendered in the BookmarkDrawer (Header), not on the homepage.
  const { courses: savedCourseSlugs } = useBookmarks();

  const savedCourseSlugSet = useMemo(
    () => new Set(savedCourseSlugs),
    [savedCourseSlugs]
  );

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
    <div className="space-y-6 sm:space-y-8">
      {/* ─── 1. Segment Switcher Tabs ────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3.5">
        <div
          role="tablist"
          aria-label="أقسام المواد الدراسية"
          className="inline-flex max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-border bg-secondary/50 p-1.5 shadow-xs"
        >
          {visibleDepartments.map((dept) => {
            const isActive = dept.id === activeDeptId;
            const icon = getDepartmentIcon(dept.slug);
            const label = getDepartmentShortLabel(dept);
            const count = dept.courses.length;

            return (
              <button
                key={dept.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() =>
                  setActiveDeptId((prev) => (prev === dept.id ? null : dept.id))
                }
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm cursor-pointer ${
                  isActive
                    ? "bg-card text-foreground shadow-sm border border-border/80 ring-2 ring-accent/30"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground border border-transparent"
                }`}
              >
                <span className="text-base sm:text-lg">{icon}</span>
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${
                      isActive
                        ? "bg-accent/15 text-accent font-semibold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── 2. Direct Course Selector Dropdown ────────────────────────────── */}
        {totalCoursesCount > 0 && (
          <div className="w-full max-w-md px-1">
            <label htmlFor="course-quick-select" className="sr-only">
              اختر مادة للانتقال السريع
            </label>
            <div className="relative">
              <select
                id="course-quick-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    router.push(e.target.value);
                  }
                }}
                className="w-full appearance-none rounded-xl border border-border bg-card px-4 py-2.5 pr-10 pl-10 text-xs sm:text-sm font-medium text-foreground shadow-xs transition-all hover:border-accent/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
              >
                <option value="" disabled>
                  {activeDept
                    ? `⚡ اختر مادة من ${getDepartmentShortLabel(activeDept)} (${activeDept.courses.length} مادة)...`
                    : `⚡ اختر مادة للانتقال المباشر (${totalCoursesCount} مادة)...`}
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

              {/* Leading Icon (Right side in RTL) */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                <span className="text-sm">🎯</span>
              </div>

              {/* Trailing Dropdown Chevron (Left side in RTL) */}
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. Department Sections (Filtered or All) ────────────────────────── */}
      <div className="space-y-8">
        {departmentsToRender.map((dept) => {
          const sorted = sortCourses(dept.courses);

          return (
            <section key={dept.id} className="space-y-3.5">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5 pt-1">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-foreground sm:text-xl">
                    <span>{getDepartmentIcon(dept.slug)}</span>
                    <span>{dept.name}</span>
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dept.slug === "placement-exams"
                      ? "نماذج ومواد تدريبية لجميع امتحانات الكفاءة"
                      : `${dept.courses.length} مادة دراسية متاحة`}
                  </p>
                </div>

                {activeDeptId && (
                  <button
                    type="button"
                    onClick={() => setActiveDeptId(null)}
                    className="flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/50 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  >
                    <span>✕</span>
                    <span>عرض الكل</span>
                  </button>
                )}
              </div>

              {/* Course Grid */}
              {dept.slug === "placement-exams" ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                  <Card
                    key="mock-placement"
                    href="/courses/placement-exams"
                    title="امتحانات المستوى"
                    courseCode={null}
                    description="نماذج ومواد تحضيرية لجميع امتحانات الكفاءة (عربي، إنجليزي، حاسوب)"
                  />
                </div>
              ) : sorted.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3">
                  {sorted.map((course) => (
                    <Card
                      key={course.id}
                      href={`/courses/${course.slug}`}
                      title={course.title}
                      courseCode={course.course_code}
                      badges={buildCourseBadges(course)}
                      isPinned={savedCourseSlugSet.has(course.slug)}
                      onTogglePin={() => toggleSavedCourse(course.slug)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/40">
                  <p className="text-sm text-muted-foreground">
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
