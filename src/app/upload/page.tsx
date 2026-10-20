import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AdminTabs from "@/components/features/AdminTabs";
import { createClient } from "@/lib/supabase/server";
import UploadForm, { type UploadCourse } from "@/components/features/UploadForm";

export const metadata: Metadata = {
  title: "مساهمة بمادة دراسية أو ملخص | ملخصات",
  description: "شارك زملاءك الطلبة بملخصاتك ومصادرك الدراسية في منصة ملخصات.",
};

interface UploadPageProps {
  searchParams: Promise<{ key?: string; courseId?: string; title?: string }>;
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const { key, courseId, title } = await searchParams;

  const isAdmin = Boolean(
    process.env.ADMIN_SECRET && key && key === process.env.ADMIN_SECRET
  );

  // Pre-fetch all courses with their existing resources for instant optimistic UX
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      course_code,
      department:departments (name),
      resources (id, title, type, file_size_bytes)
    `)
    .order("title");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12" dir="rtl">
        {/* Navigation Tabs preserving key for admin */}
        {isAdmin && <AdminTabs activeTab="upload" adminSecret={key!} />}

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            {isAdmin ? "رفع مادة دراسية جديدة (لوحة الإدارة)" : "مساهمة بمادة دراسية أو ملخص"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {isAdmin
              ? "ارفع ملخصات المواد بصيغة PDF ليتم معالجتها، ونشرها فورياً للطلاب باسم الإدارة."
              : "شارك زملاءك الطلبة بملخصاتك ومصادرك الدراسية. تخضع المذكرات لمراجعة سريعة قبل نشرها لضمان جودة المحتوى."}
          </p>
        </div>

        {/* Upload Form Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <UploadForm
            initialCourses={(courses as unknown as UploadCourse[]) || []}
            adminSecret={isAdmin ? key : undefined}
            initialCourseId={courseId}
            initialTitle={title}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
