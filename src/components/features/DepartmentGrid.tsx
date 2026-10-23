import type { DepartmentWithCourses } from "@/types/database";
import SectionHeader from "@/components/ui/SectionHeader";
import Card from "@/components/ui/Card";

interface DepartmentGridProps {
  departments: DepartmentWithCourses[];
}

/**
 * Renders all departments as sections on the landing page.
 * Each department section contains a grid of course cards.
 * Departments are rendered in `display_order` (set in the database).
 */
export default function DepartmentGrid({ departments }: DepartmentGridProps) {
  // Placement exams were conducted on Day 1 for freshmen.
  // Code and route (/courses/placement-exams) are kept 100% intact,
  // but hidden from the public homepage until future freshman admission cycles.
  // Can be toggled on/off instantly via NEXT_PUBLIC_SHOW_PLACEMENT_EXAMS="true".
  const SHOW_PLACEMENT_EXAMS =
    process.env.NEXT_PUBLIC_SHOW_PLACEMENT_EXAMS === "true";

  const visibleDepartments = departments.filter(
    (dept) => SHOW_PLACEMENT_EXAMS || dept.slug !== "placement-exams"
  );

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
    <div className="space-y-8">
      {visibleDepartments.map((dept) => (
        <section key={dept.id}>
          <SectionHeader title={dept.name} />

          {dept.courses.length > 0 || dept.slug === 'placement-exams' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dept.slug === 'placement-exams' ? (
                <Card
                  key="mock-placement"
                  href="/courses/placement-exams"
                  title="امتحانات المستوى"
                  courseCode={null}
                  description="نماذج ومواد تحضيرية لجميع امتحانات الكفاءة (عربي، إنجليزي، حاسوب)"
                />
              ) : (
                dept.courses.map((course) => {
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

                  const badges = [];
                  if (studyCount > 0) {
                    badges.push({
                      text: `${studyCount} ${studyCount === 1 ? "مورد" : "موارد"}`,
                      variant: "accent" as const,
                      icon: "📄",
                    });
                  }
                  if (quizCount > 0) {
                    badges.push({
                      text: `${quizCount} كويز • ${totalQuestions} سؤال`,
                      variant: "emerald" as const,
                      icon: "✨",
                    });
                  }
                  if (studyCount === 0 && quizCount === 0) {
                    badges.push({
                      text: "قيد الإعداد ⏳",
                      variant: "muted" as const,
                    });
                  }

                  return (
                    <Card
                      key={course.id}
                      href={`/courses/${course.slug}`}
                      title={course.title}
                      courseCode={course.course_code}
                      description={course.description}
                      badges={badges}
                    />
                  );
                })
              )}
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              قريباً — يتم تجهيز المحتوى لهذا القسم ✨
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
