import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TrackedExternalLink from "@/components/ui/TrackedExternalLink";
import { SITE_NAME, WHATSAPP_COMMUNITY_URL } from "@/lib/constants";

// Static legal & privacy page cached for 1 hour at the edge
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "الشروط والخصوصية",
  description:
    "سياسة الخصوصية، إخلاء المسؤولية الأكاديمية، وآلية الإبلاغ أو إزالة المحتوى في منصة ملخصات.",
};

export default function TermsPage() {
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

        {/* Page Header */}
        <section className="mb-8">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold leading-snug text-ink">
            الشروط{" "}
            <mark className="rounded-[10px] bg-hi px-2 py-0.5 text-ink">
              والخصوصية
            </mark>
          </h1>
          <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-muted">
            تعمل منصة {SITE_NAME} بشفافية كاملة لحماية خصوصيتك وضمان احترام حقوق
            الملكية الفكرية للجميع.
          </p>
        </section>

        <div className="space-y-6">
          {/* 1. Privacy Policy */}
          <section className="rounded-[24px] border border-line bg-surface p-5 sm:p-8 shadow-xs">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink mb-3">
              1. سياسة الخصوصية والبيانات
            </h2>
            <ul className="space-y-3 text-sm sm:text-base leading-relaxed text-muted list-disc list-inside">
              <li>
                <strong className="text-ink">بدون حسابات أو بيانات شخصية:</strong>{" "}
                لا يتطلب استخدام المنصة إنشاء حساب، ولا نجمع اسمك، بريدك
                الإلكتروني، أو رقم هاتفك عند تصفح أو تنزيل الملفات.
              </li>
              <li>
                <strong className="text-ink">
                  التخزين المحلي (localStorage):
                </strong>{" "}
                نحفظ تفضيلاتك (مثل المواد والملفات المحفوظة) ونتائج اختباراتك
                محلياً على متصفحك فقط، إلى جانب معرّف جلسة عشوائي مجهول الهوية
                لتحسين تجربة الاستخدام.
              </li>
              <li>
                <strong className="text-ink">
                  إحصائيات الأداء والأعطال:
                </strong>{" "}
                نجمع بيانات تقنية مجهولة (مثل نوع المتصفح أو أخطاء فتح ملفات
                PDF) بهدف إصلاح الأعطال على الهواتف وتسريع الموقع فقط، ولا نستخدم
                أي ملفات تعريف ارتباط إعلانية.
              </li>
            </ul>
          </section>

          {/* 2. Academic Disclaimer */}
          <section className="rounded-[24px] border border-line bg-surface p-5 sm:p-8 shadow-xs">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink mb-3">
              2. شروط الاستخدام وإخلاء المسؤولية الأكاديمية
            </h2>
            <ul className="space-y-3 text-sm sm:text-base leading-relaxed text-muted list-disc list-inside">
              <li>
                <strong className="text-ink">مبادرة طلابية مستقلة:</strong> منصة{" "}
                {SITE_NAME} جهد طلابي مجاني لمساعدة الطلبة، وليست تابعة أو
                معتمدة رسمياً من إدارة جامعة جدارا.
              </li>
              <li>
                <strong className="text-ink">مصدر مساعد فقط:</strong> جميع
                الملخصات والكويزات المنشورة هي مواد مساعدة للمراجعة ولا تُغني
                أبداً عن حضور المحاضرات أو الرجوع للمصادر الرسمية للمادة.
              </li>
              <li>
                <strong className="text-ink">مسؤولية التحقق:</strong> يرجى
                دائماً التأكد من المقرر المطلوب ومواعيد الامتحانات من مدرّس
                المساق مباشرة.
              </li>
            </ul>
          </section>

          {/* 3. IP & Content Removal (#dmca) */}
          <section
            id="dmca"
            className="scroll-mt-24 rounded-[24px] border border-line bg-surface p-5 sm:p-8 shadow-xs"
          >
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-ink mb-3">
              3. حقوق الملكية الفكرية والإبلاغ عن محتوى
            </h2>
            <div className="space-y-3 text-sm sm:text-base leading-relaxed text-muted">
              <p>
                نحترم حقوق الأساتذة والمؤلفين والطلبة المساهمين احتراماً كاملاً.
                تُرفع المواد على المنصة بغرض المشاركة التعليمية غير الربحية
                وتُراجع قبل النشر.
              </p>
              <p>
                إذا كنت صاحب حقوق لأي ملف منشور وترغب في{" "}
                <strong className="text-ink">
                  تعديل نسبة العمل أو إزالته نهائياً
                </strong>
                ، أو إذا لاحظت محتوى غير لائق أو خاطئاً أكاديمياً، يرجى مراسلتنا
                وسنقوم بمراجعة الطلب وإزالة الملف فوراً خلال أقل من 24 ساعة.
              </p>
              <p className="text-xs sm:text-sm text-muted/90">
                ملاحظة تقنية: عند حذف أي ملف من المنصة قد تبقى نسخ محفوظة
                مؤقتاً في ذاكرة المتصفحات أو في الملفات المحمّلة مسبقاً لدى
                الطلبة.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <TrackedExternalLink
                href={WHATSAPP_COMMUNITY_URL}
                eventType="whatsapp_community_click"
                metadata={{ source: "terms_dmca_report" }}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[14px] bg-btn px-5 text-sm sm:text-[15px] font-semibold text-btn-ink transition-all hover:opacity-95 active:scale-95"
              >
                <span>تواصل للإبلاغ أو إزالة محتوى (واتساب)</span>
                <span aria-hidden="true">↗</span>
              </TrackedExternalLink>

              <Link
                href="/about"
                className="inline-flex min-h-[46px] items-center justify-center rounded-[14px] border border-line bg-paper px-5 text-sm font-semibold text-ink transition-colors hover:border-ink/40"
              >
                معلومات عن مؤسس المنصة
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
