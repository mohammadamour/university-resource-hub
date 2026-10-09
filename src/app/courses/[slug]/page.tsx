import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ResourceList from "@/components/features/ResourceList";
import { createClient } from "@/lib/supabase/server";
import { REVALIDATE_COURSE, SITE_NAME } from "@/lib/constants";
import type { CourseWithResources } from "@/types/database";
import type { Metadata } from "next";

// ISR: Re-fetch data every 60 seconds (new resources appear within a minute)
export const revalidate = REVALIDATE_COURSE;

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Fetches a single course by slug, including all its resources.
 */
async function getCourse(slug: string): Promise<CourseWithResources | null> {
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select(
      `
      *,
      resources (*),
      department:departments (*)
    `
    )
    .eq("slug", slug)
    .single();

  return course as CourseWithResources | null;
}

/**
 * Generate dynamic metadata for SEO and WhatsApp link previews.
 */
export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);

  if (!course) {
    return { title: "غير موجود" };
  }

  return {
    title: `${course.title} | ${SITE_NAME}`,
    description:
      course.description ||
      `ملخصات وموارد لمادة ${course.title} — ${SITE_NAME}`,
  };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  let course = await getCourse(slug);

  // MOCK FOR PLACEMENT EXAMS (since local DB is not reset)
  if (slug === 'placement-exams' && !course) {
    course = {
      id: "mock-id",
      department_id: "mock-dept",
      title: "امتحانات المستوى",
      slug: "placement-exams",
      course_code: null,
      description: "نماذج ومواد تحضيرية لجميع امتحانات الكفاءة (عربي، إنجليزي، حاسوب)",
      instructor: null,
      semester: null,
      display_order: 0,
      created_at: new Date().toISOString(),
      resources: [
        {
          id: "1",
          course_id: "mock-id",
          title: "عربي | ملخص قواعد النحو والصرف",
          type: "summary",
          storage_url: "#",
          file_size_bytes: 2500000,
          uploaded_by: "system",
          created_at: new Date().toISOString()
        },
        {
          id: "2",
          course_id: "mock-id",
          title: "عربي | كويز تجريبي مع الحلول",
          type: "quiz",
          storage_url: "#",
          file_size_bytes: 1200000,
          uploaded_by: "system",
          created_at: new Date().toISOString()
        },
        {
          id: "3",
          course_id: "mock-id",
          title: "انجليزي | نماذج امتحانات سابقة",
          type: "past_exam",
          storage_url: "#",
          file_size_bytes: 1200000,
          uploaded_by: "system",
          created_at: new Date().toISOString()
        },
        {
          id: "4",
          course_id: "mock-id",
          title: "حاسوب | أهم اختصارات الكيبورد والأساسيات",
          type: "summary",
          storage_url: "#",
          file_size_bytes: 1200000,
          uploaded_by: "system",
          created_at: new Date().toISOString()
        }
      ] as any
    };
  }

  if (!course) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {/* Course Header */}
        <div className="mb-8">
          {course.course_code && (
            <span className="text-sm font-mono text-muted-foreground">
              {course.course_code}
            </span>
          )}
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
            {course.title}
          </h1>
          {course.description && (
            <p className="mt-2 text-muted-foreground">{course.description}</p>
          )}
          {course.instructor && (
            <p className="mt-1 text-sm text-muted-foreground">
              👨‍🏫 {course.instructor}
            </p>
          )}
        </div>

        {/* Resource List */}
        <ResourceList resources={course.resources || []} />
      </main>
      <Footer />
    </>
  );
}
