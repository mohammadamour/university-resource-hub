import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TrackedExternalLink from "@/components/ui/TrackedExternalLink";
import { SITE_NAME, WHATSAPP_COMMUNITY_URL } from "@/lib/constants";

// Static informational page cached for 1 hour at the edge
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "من أنا",
  description:
    "تعرّف على محمد العمور وقصة إنشاء منصة ملخصات — مبادرة طلابية مجانية لطلبة جامعة جدارا.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink font-sans">
      <Header />

      <main
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10"
        dir="rtl"
      >
        {/* Back to Home */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">←</span>
            <span>العودة للرئيسية</span>
          </Link>
        </div>

        {/* Page Hero */}
        <section className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1 text-xs font-semibold text-muted">
            <span className="text-brand-green">✦</span>
            <span>مبادرة طلابية مستقلة</span>
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl font-bold leading-snug text-ink">
            من وراء منصة{" "}
            <mark className="rounded-[10px] bg-hi px-2 py-0.5 text-ink">
              {SITE_NAME}
            </mark>
            ؟
          </h1>

          <p className="mt-3 text-base sm:text-lg leading-relaxed text-muted">
            أهلاً بك! أنا <strong className="text-ink">محمد العمور</strong>، طالب
            هندسة برمجيات في جامعة جدارا، ومطوّر أنظمة ويب أؤمن أن التكنولوجيا
            أجمل ما فيها حين تحل مشكلة يومية حقيقية يعيشها زملاؤك.
          </p>
        </section>

        {/* Origin Story Card */}
        <section className="mb-6 rounded-[24px] border border-line bg-surface p-5 sm:p-8 shadow-xs">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink mb-3">
            ليش بدأت فكرة {SITE_NAME}؟
          </h2>
          <div className="space-y-4 text-sm sm:text-base leading-relaxed text-muted">
            <p>
              كل فصل دراسي تتكرر نفس المعاناة في قروبات الواتساب الجامعية:
              ملفات تضيع وسط مئات الرسائل، روابط تنتهي صلاحيتها، وطلبة مستجدون
              يسألون في كل مكان عن ملخص مضمون أو أسئلة سنوات سابقة قبل الامتحان
              بساعات.
            </p>
            <p>
              قررت بناء{" "}
              <strong className="text-ink">{SITE_NAME}</strong> لتكون المرجع
              الوحيد المرتب والدائم: رابط واحد تفتحه من موبايلك بدون تسجيل دخول،
              تجد فيه الملخصات، السلايدات، وكويزات المراجعة التفاعلية لكل مادة في
              ثوانٍ.
            </p>
          </div>
        </section>

        {/* Core Pillars Grid */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[20px] border border-line bg-surface p-5">
            <div className="mb-2 text-lg font-bold text-ink">
              1. مجاني للأبد
            </div>
            <p className="text-sm leading-relaxed text-muted">
              لا رسوم اشتراك، ولا محتوى مغلق، ولا إعلانات مزعجة تبطئ تصفحك قبل
              الامتحان.
            </p>
          </div>

          <div className="rounded-[20px] border border-line bg-surface p-5">
            <div className="mb-2 text-lg font-bold text-ink">
              2. بدون تسجيل دخول
            </div>
            <p className="text-sm leading-relaxed text-muted">
              ادخل من رابط الواتساب مباشرة، تصفح الملف، أو اختبر نفسك بالكويز
              بدون حساب أو كلمة مرور.
            </p>
          </div>

          <div className="rounded-[20px] border border-line bg-surface p-5">
            <div className="mb-2 text-lg font-bold text-ink">
              3. مراجعة قبل النشر
            </div>
            <p className="text-sm leading-relaxed text-muted">
              كل ملخص يرفعه الطلبة يُراجع ويُفهرس بوضوح لضمان جودة المحتوى وسهولة
              الوصول إليه.
            </p>
          </div>
        </section>

        {/* Engineering & Community Contact Card */}
        <section className="rounded-[24px] border border-line bg-surface p-5 sm:p-8 shadow-xs">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink mb-2">
            تواصل معي أو ساهم في تطوير المنصة
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-muted mb-5">
            المنصة تكبر بمساهماتكم وملاحظاتكم. إذا كان لديك ملخص يفيد زملاءك،
            أو اقتراح لتحسين تجربة الدراسة، أو واجهت أي مشكلة تقنية، يسعدني
            سماع رأيك.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <Link
              href="/upload"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] bg-btn px-5 text-sm sm:text-[15px] font-semibold text-btn-ink transition-all hover:opacity-95 active:scale-95"
            >
              <span aria-hidden="true">+</span>
              <span>ساهم بملخص أو أسئلة</span>
            </Link>

            <TrackedExternalLink
              href={WHATSAPP_COMMUNITY_URL}
              eventType="whatsapp_community_click"
              metadata={{ source: "about_page" }}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-ink bg-transparent px-5 text-sm sm:text-[15px] font-semibold text-ink transition-all hover:bg-paper active:scale-95"
            >
              <span>انضم لمجتمع واتساب</span>
              <span aria-hidden="true">↗</span>
            </TrackedExternalLink>

            <TrackedExternalLink
              href="https://github.com/mohammadamour"
              eventType="external_link_click"
              metadata={{ source: "about_page_github" }}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] border border-line bg-paper px-5 text-sm sm:text-[15px] font-semibold text-ink transition-all hover:border-ink/40 active:scale-95"
            >
              <span>GitHub</span>
              <span aria-hidden="true">↗</span>
            </TrackedExternalLink>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
