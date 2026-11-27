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
    "شروط الاستخدام وسياسة الخصوصية لمنصة ملخصات — مبادرة طلابية مجانية لطلبة جامعة جدارا.",
};

const sections = [
  { id: "s1", num: 1, title: "ما هي المنصة" },
  { id: "s2", num: 2, title: "دقة المحتوى" },
  { id: "s3", num: 3, title: "رفع المحتوى" },
  { id: "s4", num: 4, title: "حقوق المحتوى وطلبات الإزالة" },
  { id: "s5", num: 5, title: "استخدام الملفات" },
  { id: "s6", num: 6, title: "الاستخدام الممنوع" },
  { id: "s7", num: 7, title: "الخصوصية" },
  { id: "s8", num: 8, title: "إخلاء المسؤولية" },
  { id: "s9", num: 9, title: "تعديل الشروط" },
  { id: "s10", num: 10, title: "التواصل" },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink font-sans">
      <Header />

      <main
        className="mx-auto w-full max-w-2xl flex-1 px-4 py-7 sm:px-6 sm:py-10"
        dir="rtl"
      >
        {/* Back Link */}
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/"
            aria-label="العودة للرئيسية"
            className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-line bg-surface text-ink transition-all hover:bg-paper active:scale-95"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14m0 0l-6-6m6 6l-6 6" />
            </svg>
          </Link>
        </div>

        <div className="flex flex-col gap-6 sm:gap-7">
          {/* Header Title Section */}
          <div className="flex flex-col gap-3">
            <span className="self-start inline-flex h-[30px] items-center rounded-full border border-line bg-surface px-3 text-[13.5px] font-semibold text-ink">
              آخر تحديث: 26 تشرين الثاني 2026
            </span>

            <h1 className="m-0 font-heading text-[32px] sm:text-[36px] font-bold leading-[1.55] text-ink">
              الشروط و
              <mark className="rounded-[8px] bg-hi px-1.5 text-ink">
                الخصوصية
              </mark>
            </h1>

            <p className="m-0 text-[16.5px] leading-[2] text-muted">
              كتبتها باختصار ووضوح. إن كان عندك سؤال عن أي بند، اسألني.
            </p>
          </div>

          {/* Quick Table of Contents Grid */}
          <nav
            aria-label="محتويات الصفحة"
            className="grid grid-cols-2 sm:grid-cols-2 gap-2"
          >
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex min-h-[44px] items-center gap-2 rounded-[12px] border border-line bg-surface px-3 text-[14px] font-medium text-ink transition-all hover:border-ink/40 active:scale-[0.98]"
              >
                <b className="font-semibold text-muted">{s.num}</b>
                <span className="truncate">{s.title}</span>
              </a>
            ))}
          </nav>

          {/* Detailed Legal Sections */}
          <div className="flex flex-col">
            {/* Section 1 */}
            <section
              id="s1"
              className="scroll-mt-24 border-t border-line py-5.5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  1
                </span>
                <h2 className="m-0 text-[19px] font-bold leading-[1.5] text-ink">
                  ما هي المنصة
                </h2>
              </div>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                {SITE_NAME} مشروع طلابي مستقل ومجاني وغير ربحي. المنصة غير تابعة
                رسميًا للجامعة، ولا تمثل إدارتها أو أي جهة أكاديمية فيها.
                باستخدامك الموقع فأنت توافق على الشروط التالية.
              </p>
            </section>

            {/* Section 2 */}
            <section
              id="s2"
              className="scroll-mt-24 border-t border-line py-5.5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  2
                </span>
                <h2 className="m-0 text-[19px] font-bold leading-[1.5] text-ink">
                  دقة المحتوى
                </h2>
              </div>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                الملفات ملخصات وملاحظات أعدّها طلاب، وقد تكون ناقصة أو قديمة أو
                فيها أخطاء. المرجع الرسمي دائمًا هو مادة الدكتور وخطة المساق
                وتعليمات الجامعة.
              </p>
              <div className="flex items-start gap-2.5 rounded-[16px] border border-[#ECD9A0] bg-[#F7F2E7] p-3 sm:p-3.5">
                <svg
                  aria-hidden="true"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-1 shrink-0 text-ink"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5M12 8h.01" />
                </svg>
                <p className="m-0 text-[15px] font-medium leading-[1.9] text-ink">
                  أسئلة الكويز تُولَّد بالذكاء الاصطناعي وقد تكون خاطئة أو غير
                  دقيقة. استخدمها للمراجعة فقط، ولا تعتمد عليها وحدها.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section
              id="s3"
              className="scroll-mt-24 border-t border-line py-5.5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  3
                </span>
                <h2 className="m-0 text-[19px] font-bold leading-[1.5] text-ink">
                  رفع المحتوى
                </h2>
              </div>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                عند رفعك ملفًا تؤكد أن لك الحق في مشاركته، وأنه لا ينتهك حقوق
                نشر أو خصوصية أحد، ولا يحتوي برمجيات ضارة أو بيانات شخصية
                لآخرين دون إذن.
              </p>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                كل ملف يُراجع قبل نشره، ويحق لصاحب المنصة رفضه أو تعديله أو
                إزالته في أي وقت، خاصة عند مخالفة هذه الشروط أو ورود بلاغ
                موثوق.
              </p>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                بنشر ملفك تسمح للمنصة بعرضه وإتاحته للتحميل مجانًا للطلاب،
                وإضافة علامة مائية تحمل اسم المنصة.
              </p>
            </section>

            {/* Section 4 */}
            <section
              id="s4"
              className="scroll-mt-24 border-t border-line py-5.5 flex flex-col gap-3"
            >
              <div id="dmca" className="scroll-mt-24 flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  4
                </span>
                <h2 className="m-0 text-[19px] font-bold leading-[1.5] text-ink">
                  حقوق المحتوى وطلبات الإزالة
                </h2>
              </div>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                نحترم حقوق الدكاترة والمؤلفين. إن كنت دكتورًا أو صاحب حق في ملف
                منشور على المنصة وتريد إزالته أو تعديله، فراسلني مع رابط الملف
                أو اسمه، وسأردّ خلال [3 أيام] وأزيله بعد التحقق، دون إجراءات
                معقدة.
              </p>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                ويسعدني التعاون مع الدكاترة الراغبين بنشر موادهم رسميًا مع ذكر
                أسمائهم.
              </p>
              <TrackedExternalLink
                href={WHATSAPP_COMMUNITY_URL}
                eventType="whatsapp_community_click"
                metadata={{ source: "terms_dmca_button" }}
                className="self-start inline-flex h-[48px] items-center gap-2 rounded-[14px] bg-btn px-5 text-[15.5px] font-bold text-btn-ink transition-all hover:opacity-95 active:scale-95"
              >
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 21V4m0 0h11l-2 4 2 4H5" />
                </svg>
                <span>أرسل طلب إزالة</span>
              </TrackedExternalLink>
            </section>

            {/* Section 5 */}
            <section
              id="s5"
              className="scroll-mt-24 border-t border-line py-5.5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  5
                </span>
                <h2 className="m-0 text-[19px] font-bold leading-[1.5] text-ink">
                  استخدام الملفات
                </h2>
              </div>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                الملفات مخصصة للدراسة الشخصية. لا يجوز بيعها أو استخدامها
                تجاريًا، ولا إزالة العلامة المائية، ولا نسب المحتوى لغير مصدره.
              </p>
            </section>

            {/* Section 6 */}
            <section
              id="s6"
              className="scroll-mt-24 border-t border-line py-5.5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  6
                </span>
                <h2 className="m-0 text-[19px] font-bold leading-[1.5] text-ink">
                  الاستخدام الممنوع
                </h2>
              </div>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                يُمنع محاولة اختراق الموقع أو تعطيله، ورفع ملفات مزعجة أو ضارة،
                وجمع الملفات آليًا بكميات كبيرة. يجوز منع الوصول عند إساءة
                الاستخدام.
              </p>
            </section>

            {/* Section 7 */}
            <section
              id="s7"
              className="scroll-mt-24 border-t border-line py-5.5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  7
                </span>
                <h2 className="m-0 text-[19px] font-bold leading-[1.5] text-ink">
                  الخصوصية
                </h2>
              </div>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                لا يتطلب الموقع حسابًا، ولا نطلب منك اسمًا أو رقمًا لتصفحه.
              </p>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                نستخدم أداة تحليلات (Vercel Analytics) لقياس الزيارات بشكل
                مجمّع، ونسجّل أحداث استخدام أساسية مثل فتح ملف أو بدء كويز
                لتحسين المنصة. روابط المشاركة تحمل معرّفًا لمعرفة مصدر الزيارة.
              </p>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                المحفوظات تُخزَّن على جهازك فقط. وعند رفع ملف نحتفظ بالملف وبما
                تكتبه في النموذج.
              </p>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                لا نبيع بياناتك ولا نشاركها مع جهات إعلانية.
              </p>
            </section>

            {/* Section 8 */}
            <section
              id="s8"
              className="scroll-mt-24 border-t border-line py-5.5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  8
                </span>
                <h2 className="m-0 text-[19px] font-bold leading-[1.5] text-ink">
                  إخلاء المسؤولية
                </h2>
              </div>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                تُقدَّم المنصة كما هي، دون ضمان لدقتها أو استمرارها. لا يتحمل
                صاحبها مسؤولية أي قرار أكاديمي أو غيره بُني على محتواها، وقد
                تتغير الخدمة أو تتوقف.
              </p>
            </section>

            {/* Section 9 */}
            <section
              id="s9"
              className="scroll-mt-24 border-t border-line py-5.5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  9
                </span>
                <h2 className="m-0 text-[19px] font-bold leading-[1.5] text-ink">
                  تعديل الشروط
                </h2>
              </div>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                قد تُحدَّث هذه الشروط مع تطور المنصة، وتاريخ آخر تحديث مذكور
                أعلاها. استمرارك في الاستخدام يعني موافقتك على النسخة الحالية.
              </p>
            </section>

            {/* Section 10 */}
            <section
              id="s10"
              className="scroll-mt-24 border-t border-line py-5.5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  10
                </span>
                <h2 className="m-0 text-[19px] font-bold leading-[1.5] text-ink">
                  التواصل
                </h2>
              </div>
              <p className="m-0 text-[15.5px] leading-[2] text-muted">
                لأي استفسار أو بلاغ أو اقتراح، تواصل معي عبر{" "}
                <TrackedExternalLink
                  href={WHATSAPP_COMMUNITY_URL}
                  eventType="whatsapp_community_click"
                  metadata={{ source: "terms_contact_link" }}
                  className="font-bold text-[#2A4DB0] underline underline-offset-4 hover:opacity-80"
                >
                  مجتمع واتساب
                </TrackedExternalLink>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
