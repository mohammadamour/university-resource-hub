import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ResourceList from "@/components/features/ResourceList";
import CoursePinButton from "@/components/features/CoursePinButton";
import { createClient } from "@/lib/supabase/server";
import { REVALIDATE_COURSE, SITE_NAME } from "@/lib/constants";
import type { CourseWithResources, Resource } from "@/types/database";
import type { Metadata } from "next";

// ISR: Cache course pages at the edge for 1 hour (3600s). On-demand revalidation purges this instantly on uploads/edits.
export const revalidate = 3600;

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
    .eq("resources.status", "active")
    .single();

  return course as CourseWithResources | null;
}

/**
 * Fallback mock course for `/courses/placement-exams` when not yet seeded in DB.
 * Shared between `generateMetadata` and `CoursePage` so link crawlers never see a false 404 title.
 */
function getPlacementExamsMockCourse(): CourseWithResources {
  const now = new Date().toISOString();
  return {
    id: "mock-id",
    department_id: "mock-dept",
    title: "امتحانات المستوى",
    slug: "placement-exams",
    course_code: null,
    description: "نماذج ومواد تحضيرية لجميع امتحانات الكفاءة (عربي، إنجليزي، حاسوب)",
    instructor: null,
    semester: null,
    display_order: 0,
    created_at: now,
    resources: [
      {
        id: "1",
        course_id: "mock-id",
        title: "عربي | ملخص قواعد النحو والصرف",
        type: "summary",
        storage_url: "#",
        file_size_bytes: 2500000,
        uploaded_by: "system",
        created_at: now,
      },
      {
        id: "2",
        course_id: "mock-id",
        title: "عربي | كويز تجريبي مع الحلول",
        type: "quiz",
        storage_url: "#",
        file_size_bytes: 1200000,
        uploaded_by: "system",
        created_at: now,
      },
      {
        id: "3",
        course_id: "mock-id",
        title: "انجليزي | نماذج امتحانات سابقة",
        type: "past_exam",
        storage_url: "#",
        file_size_bytes: 1200000,
        uploaded_by: "system",
        created_at: now,
      },
      {
        id: "4",
        course_id: "mock-id",
        title: "حاسوب | أهم اختصارات الكيبورد والأساسيات",
        type: "summary",
        storage_url: "#",
        file_size_bytes: 1200000,
        uploaded_by: "system",
        created_at: now,
      },
      {
        id: "5",
        course_id: "mock-id",
        title: "حاسوب | امتحان تجريبي تفاعلي",
        type: "quiz",
        storage_url: "https://share.gemini.google/KowylEzTUiIe",
        file_size_bytes: 0,
        uploaded_by: "system",
        created_at: now,
      },
    ] as Resource[],
  };
}

/**
 * Fetches a course with the placement-exams fallback applied consistently
 * for both metadata generation and page rendering.
 */
async function getCourseWithFallback(
  slug: string
): Promise<CourseWithResources | null> {
  const course = await getCourse(slug);
  if (!course && slug === "placement-exams") {
    return getPlacementExamsMockCourse();
  }
  return course;
}

function formatArabicCount(
  count: number,
  singular: string,
  dual: string,
  pluralFew: string,
  accusativeMany: string
): string {
  if (count === 1) return `1 ${singular}`;
  if (count === 2) return dual;
  if (count >= 3 && count <= 10) return `${count} ${pluralFew}`;
  return `${count} ${accusativeMany}`;
}

/**
 * Builds concise, high-signal Arabic OpenGraph summary text from live course stats.
 * Leads with counts so WhatsApp/Telegram previews show value before any line truncation.
 */
function buildCourseShareDescription(course: CourseWithResources): string {
  const activeResources = (course.resources ?? []).filter(
    (r) => (r.status || "active") === "active"
  );
  const resourceCount = activeResources.length;
  const quizQuestionCount = activeResources.reduce(
    (sum, r) => sum + (r.quiz_data?.questions?.length ?? 0),
    0
  );

  const statsParts: string[] = [];
  if (resourceCount > 0) {
    statsParts.push(
      formatArabicCount(
        resourceCount,
        "ملف ومورد",
        "ملفان وموردان",
        "ملفات وموارد",
        "ملفاً ومورداً"
      )
    );
  }
  if (quizQuestionCount > 0) {
    statsParts.push(
      formatArabicCount(
        quizQuestionCount,
        "سؤال تفاعلي",
        "سؤالان تفاعليان",
        "أسئلة تفاعلية",
        "سؤالاً تفاعلياً"
      )
    );
  }

  const fallbackDesc =
    course.description ||
    `ملخصات ونماذج امتحانات لمادة ${course.title} — قراءة فورية بدون تسجيل`;

  if (statsParts.length === 0) {
    return fallbackDesc;
  }

  const suffix = course.description
    ? course.description
    : "قراءة فورية واختبارات مجانية بدون تسجيل";

  return `${statsParts.join(" • ")} — ${suffix}`;
}

/**
 * Generate dynamic metadata for SEO and WhatsApp / Telegram link previews.
 * Note: Intentionally reads only `params` (never `searchParams`) to preserve ISR caching (`revalidate = 3600`).
 */
export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseWithFallback(slug);

  if (!course) {
    return { title: "غير موجود" };
  }

  // Layout defines `title.template = "%s | ملخصات"`, so omit the brand suffix here to avoid duplication.
  const displayTitle = course.course_code
    ? `${course.title} (${course.course_code})`
    : course.title;
  const description = buildCourseShareDescription(course);
  const ogTitle = `${displayTitle} | ${SITE_NAME}`;
  const canonicalPath = `/courses/${course.slug}`;

  return {
    title: displayTitle,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: ogTitle,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      locale: "ar_JO",
      type: "website",
      images: [
        {
          // Static pre-rendered JPEG (<100 KB) avoids Satori Arabic shaping glitches and WhatsApp's 300 KB crawler limit.
          url: "/og-default.jpg",
          width: 1200,
          height: 630,
          alt: `${displayTitle} — ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: ["/og-default.jpg"],
    },
  };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const course = await getCourseWithFallback(slug);

  if (!course) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {/* Navigation: Return to Homepage Pill */}
        <div className="mb-5 sm:mb-6">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xs transition-all hover:border-primary/40 hover:bg-card hover:text-primary hover:shadow-2xs active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              {/* Right-pointing arrow for RTL back navigation */}
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
            <span>العودة للرئيسية</span>
          </Link>
        </div>

        {/* Course Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {course.course_code && (
              <span className="text-sm font-mono text-muted-foreground">
                {course.course_code}
              </span>
            )}
            <h1 dir="auto" className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
              {course.title}
            </h1>
            {course.description && (
              <p dir="auto" className="mt-2 text-muted-foreground">{course.description}</p>
            )}
            {course.instructor && (
              <p className="mt-1 text-sm text-muted-foreground">
                👨‍🏫 {course.instructor}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start">
            <CoursePinButton
              courseId={course.id}
              courseSlug={course.slug}
              courseTitle={course.title}
              courseCode={course.course_code}
            />
            <Link
              href={`/upload?courseId=${encodeURIComponent(course.id)}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95 shadow-2xs"
            >
              <span>➕</span>
              <span>شارك ملخصاً</span>
            </Link>
          </div>
        </div>

        {/* Resource List */}
        <ResourceList
          resources={course.resources || []}
          courseId={course.id}
          courseTitle={course.title}
          courseSlug={course.slug}
        />
      </main>
      <Footer />
    </>
  );
}
