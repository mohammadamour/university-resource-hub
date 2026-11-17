import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ResourceList from "@/components/features/ResourceList";
import CoursePinButton from "@/components/features/CoursePinButton";
import { createClient } from "@/lib/supabase/server";
import { REVALIDATE_COURSE, SITE_NAME } from "@/lib/constants";
import { getCourseHueStyles } from "@/lib/design-hues";
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

  // Compute stats for the hero banner from active resources only
  const activeResources = (course.resources ?? []).filter(
    (r) => (r.status || "active") === "active"
  );
  const fileCount = activeResources.filter((r) => r.type !== "quiz").length;
  const quizCount = activeResources.filter((r) => Boolean(r.quiz_data?.questions?.length) || r.type === "quiz").length;
  const totalPages = activeResources.reduce(
    (sum, r) => sum + (r.page_count ?? 0),
    0
  );

  // Pull the hue palette for this course slug — same system as card covers
  const hue = getCourseHueStyles(course.slug);

  // Department label for the breadcrumb middle crumb
  const deptLabel =
    (course.department as { name?: string } | null)?.name ?? "المواد";

  // WhatsApp share link for the whole course
  const waCourseText = `ملخصات ونماذج امتحانات لمادة ${course.title} — قراءة فورية بدون تسجيل:\nhttps://molakhasat.me/courses/${course.slug}`;
  const waCourseUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waCourseText)}`;

  return (
    <>
      <Header />
      {/* Widened to max-w-6xl to support the two-column resource + sidebar layout */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10" dir="rtl">

        {/* ── Breadcrumb nav ────────────────────────────────────────────── */}
        <nav aria-label="مسار التنقل" className="mb-6">
          <ol className="flex items-center gap-1.5 text-sm text-muted flex-wrap">
            <li>
              <Link
                href="/"
                className="text-muted hover:text-ink transition-colors min-h-[44px] inline-flex items-center"
              >
                الرئيسية
              </Link>
            </li>
            <li aria-hidden="true">
              {/* RTL-aware separator: left-pointing chevron */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </li>
            <li>
              <Link
                href="/"
                className="text-muted hover:text-ink transition-colors min-h-[44px] inline-flex items-center"
              >
                {deptLabel}
              </Link>
            </li>
            <li aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </li>
            <li className="text-ink font-medium truncate max-w-[200px] sm:max-w-xs" aria-current="page">
              {course.title}
            </li>
          </ol>
        </nav>

        {/* ── Course Hero Banner ─────────────────────────────────────────── */}
        <div
          className="mb-8 overflow-hidden rounded-[28px] relative p-6 sm:p-9"
          style={{
            // Hue-tinted background + subtle ruled notebook lines
            backgroundColor: hue.tint,
            backgroundImage: hue.coverBg
              .replace(/^background-color:[^;]+;\s*background-image:\s*/, "")
              .replace(/;$/, ""),
          }}
        >
          {/* Vertical margin guide line — left edge in RTL */}
          <div
            className="absolute inset-y-0 inset-inline-start-8 w-[2px]"
            style={{ backgroundColor: hue.marginLine }}
            aria-hidden="true"
          />

          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            {/* Left Column: Details + Actions */}
            <div className="flex-1 min-w-0 max-w-2xl">
              {/* Department chip */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center rounded-[9px] px-3 py-1 text-xs font-bold tracking-wide"
                  style={{ backgroundColor: hue.chipBg, color: hue.deep }}
                >
                  {course.course_code ? `${deptLabel} • ${course.course_code}` : deptLabel}
                </span>
              </div>

              {/* Course title */}
              <h1
                dir="auto"
                className="font-heading font-bold text-ink leading-snug mb-3"
                style={{ fontSize: "clamp(26px, 4.4vw, 44px)" }}
              >
                {course.title}
              </h1>

              {/* Description */}
              {course.description && (
                <p
                  dir="auto"
                  className="text-base sm:text-[17px] leading-relaxed mb-6 max-w-[520px]"
                  style={{ color: hue.deep, opacity: 0.88 }}
                >
                  {course.description}
                </p>
              )}

              {/* Instructor row */}
              {course.instructor && (
                <p className="text-sm mb-5 font-medium" style={{ color: hue.deep, opacity: 0.75 }}>
                  د. {course.instructor}
                </p>
              )}

              {/* CTA row: WhatsApp Share + Bookmark + Upload */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Primary WhatsApp Share for Course */}
                <a
                  href={waCourseUrl}
                  className="inline-flex min-h-[50px] shrink-0 items-center gap-2.5 rounded-[15px] bg-btn px-5 text-sm font-semibold text-btn-ink transition-all hover:opacity-90 active:scale-95 shadow-sm"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z"/>
                    <path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z"/>
                  </svg>
                  <span>شارك المادة في قروبك</span>
                </a>

                {/* Course Bookmark Pin */}
                <CoursePinButton
                  courseId={course.id}
                  courseSlug={course.slug}
                  courseTitle={course.title}
                  courseCode={course.course_code}
                />

                {/* Upload Contribution Button */}
                <Link
                  href={`/upload?courseId=${encodeURIComponent(course.id)}`}
                  className="inline-flex min-h-[50px] shrink-0 items-center gap-2 rounded-[15px] border-[1.5px] border-ink bg-transparent px-4 text-sm font-semibold text-ink transition-all hover:bg-ink/8 active:scale-95"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>شارك ملخصاً</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Stat Cards (Matching Claude Course.dc.html) */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
              <div className="min-w-[90px] sm:min-w-[100px] p-3.5 sm:p-4 rounded-[18px] bg-surface border border-line flex-1 sm:flex-none">
                <div
                  className="font-heading text-3xl font-bold leading-tight"
                  style={{ color: hue.deep }}
                >
                  {fileCount}
                </div>
                <div className="text-xs sm:text-sm text-muted mt-0.5">ملفات</div>
              </div>

              <div className="min-w-[90px] sm:min-w-[100px] p-3.5 sm:p-4 rounded-[18px] bg-surface border border-line flex-1 sm:flex-none">
                <div
                  className="font-heading text-3xl font-bold leading-tight"
                  style={{ color: hue.deep }}
                >
                  {quizCount}
                </div>
                <div className="text-xs sm:text-sm text-muted mt-0.5">كويز</div>
              </div>

              <div className="min-w-[90px] sm:min-w-[100px] p-3.5 sm:p-4 rounded-[18px] bg-surface border border-line flex-1 sm:flex-none">
                <div
                  className="font-heading text-3xl font-bold leading-tight"
                  style={{ color: hue.deep }}
                >
                  {totalPages > 0 ? `${totalPages}+` : "0"}
                </div>
                <div className="text-xs sm:text-sm text-muted mt-0.5">صفحة</div>
              </div>
            </div>
          </div>
        </div>

        {/* Resource List with Filter Tabs & Sidebar */}
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
