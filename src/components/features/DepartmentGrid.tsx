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
  if (departments.length === 0) {
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
      {departments.map((dept) => (
        <section key={dept.id}>
          <SectionHeader title={dept.name} />

          {dept.courses.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dept.courses.map((course) => (
                <Card
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  title={course.title}
                  courseCode={course.course_code}
                  description={course.description}
                />
              ))}
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
