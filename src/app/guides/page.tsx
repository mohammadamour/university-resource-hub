import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SITE_NAME } from "@/lib/constants";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `أدلة ونصائح | ${SITE_NAME}`,
  description: "أدلة عملية ونصائح للطلاب الجدد — كيف تتنقل في الجامعة بذكاء",
};

/**
 * Static guides listing page.
 * These are high-value "bureaucracy survival guides" for freshmen.
 * Content is hardcoded for V1 since guides change infrequently.
 */

interface Guide {
  slug: string;
  title: string;
  description: string;
  emoji: string;
}

const GUIDES: Guide[] = [
  {
    slug: "getting-started",
    title: "دليل الطالب الجديد",
    description:
      "كل ما تحتاج معرفته عن الجامعة — البوابات، التسجيل، والنصائح الأساسية",
    emoji: "🎓",
  },
  {
    slug: "github-education",
    title: "كيف تحصل على GitHub Education Pack",
    description:
      "احصل على أدوات مجانية بقيمة آلاف الدولارات — Copilot, Azure, ونطاقات مجانية",
    emoji: "🐙",
  },
  {
    slug: "gemini-pro",
    title: "كيف تفعّل Gemini Pro مجاناً",
    description: "استخدم بريدك الجامعي للحصول على Gemini Pro بدون أي تكلفة",
    emoji: "✨",
  },
  {
    slug: "it-survival-guide",
    title: "دليل البقاء لطلاب تكنولوجيا المعلومات",
    description: "نصائح من طلاب سابقين — ماذا تدرس، ماذا تتجنب، وكيف تتفوق",
    emoji: "💻",
  },
];

export default function GuidesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          أدلة ونصائح
        </h1>
        <p className="mt-2 text-muted-foreground">
          أدلة عملية لمساعدتك في التنقل بالجامعة بذكاء 🧭
        </p>

        <div className="mt-8 space-y-3">
          {GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-accent hover:shadow-md active:scale-[0.98] sm:p-5"
            >
              <span className="text-2xl">{guide.emoji}</span>
              <div>
                <h2 className="text-base font-semibold text-card-foreground sm:text-lg">
                  {guide.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {guide.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
