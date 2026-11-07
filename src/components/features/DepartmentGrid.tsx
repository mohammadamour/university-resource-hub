"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { DepartmentWithCourses } from "@/types/database";
import Card, { CardBadge } from "@/components/ui/Card";

interface DepartmentGridProps {
  departments: DepartmentWithCourses[];
}

/**
 * Returns an appropriate emoji icon based on department slug.
 */
function getDepartmentIcon(slug: string): string {
  if (slug === "it" || slug.includes("it")) return "💻";
  if (slug === "university-requirements" || slug.includes("requirement")) return "🏛️";
  if (slug === "placement-exams") return "📝";
  return "📚";
}

/**
 * Returns a concise, punchy Arabic label for segment switcher tabs.
 */
function getDepartmentShortLabel(dept: DepartmentWithCourses): string {
  if (dept.slug === "it" || dept.slug.includes("it")) return "مواد IT";
  if (dept.slug === "university-requirements") return "متطلبات الجامعة";
  if (dept.slug === "placement-exams") return "امتحانات المستوى";
  return dept.name;
}

/**
 * 2-Segment Switcher + 2-Column Mobile Course Grid + Direct Course Selector.
 *
 * Implements Step 5:
 * 1. Fast client-side segment switcher (IT vs University Requirements).
 * 2. Course selector dropdown for instant direct navigation without manual searching.
 * 3. Ergonomic 2-column mobile grid for high information density on small screens.
 */
export default function DepartmentGrid({ departments }: DepartmentGridProps) {
  const router = useRouter();

  // Placement exams feature flag (Day 1 freshmen admission gate)
  const SHOW_PLACEMENT_EXAMS =
    process.env.NEXT_PUBLIC_SHOW_PLACEMENT_EXAMS === "true";

  // Filter visible departments according to business rules
  const visibleDepartments = useMemo(() => {
    return departments.filter(
      (dept) =>
        (SHOW_PLACEMENT_EXAMS || dept.slug !== "placement-exams") &&
        dept.slug !== "english" &&
        (dept.courses.length > 0 || dept.slug === "placement-exams")
    );
  }, [departments, SHOW_PLACEMENT_EXAMS]);

  // Default to IT department (highest student traffic)
  const defaultDept = useMemo(() => {
    return (
      visibleDepartments.find(
        (d) => d.slug === "it" || d.slug.includes("it")
      ) || visibleDepartments[0]
    );
  }, [visibleDepartments]);

  const [activeDeptId, setActiveDeptId] = useState<string>(
    defaultDept?.id || ""
  );

  // Active department with fallback to default
  const activeDept =
    visibleDepartments.find((d) => d.id === activeDeptId) || defaultDept;

  // Sort courses: courses with active resources first, then remaining courses
  const sortedCourses = useMemo(() => {
    if (!activeDept?.courses) return [];
    return [...activeDept.courses].sort((a, b) => {
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
  }, [activeDept]);

  if (visibleDepartments.length === 0 || !activeDept) {
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
            const isActive = dept.id === activeDept.id;
            const icon = getDepartmentIcon(dept.slug);
            const label = getDepartmentShortLabel(dept);
            const count = dept.courses.length;

            return (
              <button
                key={dept.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveDeptId(dept.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm cursor-pointer ${
                  isActive
                    ? "bg-card text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                }`}
              >
                <span className="text-base sm:text-lg">{icon}</span>
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
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
        {sortedCourses.length > 0 && (
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
                  ⚡ اختر مادة للانتقال المباشر ({sortedCourses.length} مادة)...
                </option>
                {sortedCourses.map((course) => (
                  <option key={course.id} value={`/courses/${course.slug}`}>
                    {course.title} {course.course_code ? `(${course.course_code})` : ""}
                  </option>
                ))}
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

      {/* ─── 3. Active Section Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 pt-1">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground sm:text-xl">
            <span>{getDepartmentIcon(activeDept.slug)}</span>
            <span>{activeDept.name}</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activeDept.slug === "placement-exams"
              ? "نماذج ومواد تدريبية لجميع امتحانات الكفاءة"
              : `${sortedCourses.length} مادة دراسية متاحة`}
          </p>
        </div>
      </div>

      {/* ─── 4. 2-Column Mobile Course Grid ──────────────────────────────────── */}
      {activeDept.slug === "placement-exams" ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
          <Card
            key="mock-placement"
            href="/courses/placement-exams"
            title="امتحانات المستوى"
            courseCode={null}
            description="نماذج ومواد تحضيرية لجميع امتحانات الكفاءة (عربي، إنجليزي، حاسوب)"
          />
        </div>
      ) : sortedCourses.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3">
          {sortedCourses.map((course) => {
            const activeResources = (course.resources || []).filter(
              (r) => (r.status || "active") === "active"
            );
            const studyCount = activeResources.filter(
              (r) => r.type !== "quiz"
            ).length;
            const quizResources = activeResources.filter(
              (r) =>
                r.quiz_data &&
                r.quiz_data.questions &&
                r.quiz_data.questions.length > 0
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

            return (
              <Card
                key={course.id}
                href={`/courses/${course.slug}`}
                title={course.title}
                courseCode={course.course_code}
                badges={badges}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/40">
          <p className="text-sm text-muted-foreground">
            قريباً — يتم تجهيز المحتوى لهذا القسم ✨
          </p>
        </div>
      )}
    </div>
  );
}
