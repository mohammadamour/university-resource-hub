import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "بوابة رفع الموارد | ملخصات",
  robots: {
    index: false,
    follow: false,
  },
};

interface UploadPageProps {
  searchParams: Promise<{ key?: string }>;
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const { key } = await searchParams;

  // Gate check: If ADMIN_SECRET is not configured or key doesn't match, return 404
  if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 mb-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            بوابة الإدارة المركزية (مصرح)
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            رفع وتنسيق المواد الدراسية
          </h1>
          <p className="mt-2 text-sm text-neutral-400 sm:text-base">
            ارفع ملخصات المواد بصيغة PDF ليتم معالجتها، وتوليد كويزات تفاعلية اختيارياً ونشرها للطلاب.
          </p>
        </div>

        {/* Upload Form Container Placeholder */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 sm:p-8 backdrop-blur-sm">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 mb-4 text-xl">
              ⚡
            </div>
            <h2 className="text-lg font-semibold text-neutral-200">
              تم التحقق من صلاحيات الإدارة بنجاح
            </h2>
            <p className="mt-1 text-sm text-neutral-400 max-w-md">
              بوابة الرفع جاهزة الآن لبناء نموذج رفع الملفات وتفعيل خط المعالجة (Pipeline).
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
