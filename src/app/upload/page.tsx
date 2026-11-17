import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AdminTabs from "@/components/features/AdminTabs";
import { createClient } from "@/lib/supabase/server";
import UploadForm, { type UploadCourse } from "@/components/features/UploadForm";
import { verifyAdminSecret } from "@/lib/admin-auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "مساهمة بمادة دراسية أو ملخص | ملخصات",
  description: "شارك زملاءك الطلبة بملخصاتك ومصادرك الدراسية في منصة ملخصات.",
};

interface UploadPageProps {
  searchParams: Promise<{ key?: string; courseId?: string; course?: string; title?: string }>;
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const { key, courseId, course, title } = await searchParams;

  const isAdmin = verifyAdminSecret(key);

  // Pre-fetch all courses with their existing resources for instant optimistic UX
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id,
      slug,
      title,
      course_code,
      department:departments (name),
      resources (id, title, type, file_size_bytes)
    `)
    .order("title");

  // Support resolving course by ID or slug for flexible inbound funnel links
  const rawCourseParam = courseId || course;
  const resolvedCourseId = rawCourseParam
    ? courses?.find((c) => c.id === rawCourseParam || c.slug === rawCourseParam)?.id || rawCourseParam
    : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink font-sans">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-10" dir="rtl">
        {/* Navigation Tabs preserving key for admin */}
        {isAdmin && <AdminTabs activeTab="upload" adminSecret={key!} />}

        {/* Back Link to Home */}
        <div className="mb-3">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted hover:text-ink transition-colors"
          >
            <span>←</span>
            <span>العودة للرئيسية</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-7">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold leading-relaxed text-ink">
            {isAdmin ? (
              "رفع مادة دراسية جديدة (لوحة الإدارة)"
            ) : (
              <>
                ساهم{" "}
                <mark className="rounded-[9px] bg-hi px-1.5 py-0.5 text-ink">
                  بملخص
                </mark>{" "}
                أو مادة
              </>
            )}
          </h1>
          <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted">
            {isAdmin
              ? "ارفع ملخصات المواد بصيغة PDF ليتم معالجتها، ونشرها فورياً للطلاب باسم الإدارة."
              : "شارك زملاءك الطلبة بملخصاتك ومصادرك. يراجعها فريق المنصة بسرعة قبل النشر لضمان الجودة والفائدة للجميع."}
          </p>
        </div>

        {/* Upload Form Card */}
        <div className="rounded-[24px] border border-line bg-surface p-5 sm:p-8 shadow-xs">
          <UploadForm
            initialCourses={(courses as unknown as UploadCourse[]) || []}
            adminSecret={isAdmin ? key : undefined}
            initialCourseId={resolvedCourseId}
            initialTitle={title}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
