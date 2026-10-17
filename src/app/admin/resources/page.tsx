import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AdminTabs from "@/components/features/AdminTabs";
import AdminResourceManager, {
  type AdminResourceItem,
  type AdminCourseOption,
} from "@/components/features/AdminResourceManager";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "إدارة الموارد والمواد الدراسية | ملخصات",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminResourcesPageProps {
  searchParams: Promise<{ key?: string }>;
}

export default async function AdminResourcesPage({
  searchParams,
}: AdminResourcesPageProps) {
  const { key } = await searchParams;

  // Gate check: If ADMIN_SECRET is not configured or key doesn't match, return 404
  if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    notFound();
  }

  // Pre-fetch all resources with their courses, and all courses for filters
  const supabase = createAdminClient();

  const [resourcesResult, coursesResult] = await Promise.all([
    supabase
      .from("resources")
      .select(`
        id,
        course_id,
        title,
        type,
        storage_url,
        file_size_bytes,
        status,
        created_at,
        quiz_data,
        course:courses (
          id,
          title,
          slug,
          course_code,
          department:departments (name)
        )
      `)
      .order("created_at", { ascending: false }),

    supabase
      .from("courses")
      .select(`
        id,
        title,
        slug,
        course_code,
        department:departments (name)
      `)
      .order("title"),
  ]);

  const resources = (resourcesResult.data || []) as unknown as AdminResourceItem[];
  const courses = (coursesResult.data || []) as unknown as AdminCourseOption[];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12" dir="rtl">
        {/* Navigation Tabs preserving key */}
        <AdminTabs
          activeTab="resources"
          adminSecret={key!}
          resourceCount={resources.length}
        />

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            لوحة إدارة وتعديل الموارد المرفوعة
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            إدارة المذكرات والملخصات المرفوعة، تعديل العناوين، إعادة تخصيص المواد، والحذف الذري من التخزين السحابي وقاعدة البيانات.
          </p>
        </div>

        {/* Manager Table & Interactions */}
        <AdminResourceManager
          initialResources={resources}
          courses={courses}
          adminSecret={key!}
        />
      </main>
      <Footer />
    </>
  );
}
