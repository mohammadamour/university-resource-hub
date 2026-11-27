import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TrackedExternalLink from "@/components/ui/TrackedExternalLink";
import LogoMark from "@/components/ui/LogoMark";
import { createPublicClient } from "@/lib/supabase/server";
import {
  SITE_NAME,
  CONTACT_PHONE_RAW,
  CONTACT_PHONE_LOCAL,
} from "@/lib/constants";

// Static informational page cached for 1 hour at the edge
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "من أنا",
  description:
    "تعرّف على محمد العمور وقصة إنشاء منصة ملخصات — مبادرة طلابية مجانية لطلبة جامعة جدارا.",
};

async function getPlatformMetrics() {
  try {
    const supabase = createPublicClient();
    const { data: courses } = await supabase
      .from("courses")
      .select("id, resources (id, status)");

    if (!courses) return { activeCourses: 20, activeResources: 130 };

    let totalResources = 0;
    let activeCourses = 0;

    for (const c of courses) {
      const activeRes = (c.resources || []).filter(
        (r: { id: string; status?: string }) => (r.status || "active") === "active"
      );
      if (activeRes.length > 0) {
        activeCourses++;
        totalResources += activeRes.length;
      }
    }

    return {
      activeCourses: activeCourses || 20,
      activeResources: totalResources || 130,
    };
  } catch {
    return { activeCourses: 20, activeResources: 130 };
  }
}

export default async function AboutPage() {
  const metrics = await getPlatformMetrics();

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
          {/* Top Hero Section */}
          <div className="flex flex-col gap-3.5">
            <span className="self-start inline-flex h-[30px] items-center rounded-full border border-line bg-surface px-3 text-[13.5px] font-semibold text-ink">
              مبادرة طلابية مستقلة
            </span>

            <h1 className="m-0 font-heading text-[32px] sm:text-[36px] font-bold leading-[1.55] text-ink">
              من وراء{" "}
              <mark className="rounded-[8px] bg-hi px-1.5 text-ink">
                {SITE_NAME}
              </mark>
              ؟
            </h1>

            <p className="m-0 text-[16.5px] sm:text-[17px] leading-[2] text-muted">
              أنا <b>محمد العمور</b>، طالب سنة أولى هندسة برمجيات في جامعة
              جدارا. بنيت ملخصات وحدي، بجانب دراستي، لأن زملائي كانوا يسألونني
              كل فصل عن الملخصات والمصادر.
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="rounded-[18px] border border-line bg-surface p-3.5 sm:p-4 text-center shadow-2xs">
              <div
                className="font-heading text-2xl sm:text-[26px] font-bold leading-[1.3] text-ink"
                dir="ltr"
              >
                {metrics.activeResources}+
              </div>
              <div className="text-[13px] text-muted">ملف معتمد</div>
            </div>

            <div className="rounded-[18px] border border-line bg-surface p-3.5 sm:p-4 text-center shadow-2xs">
              <div
                className="font-heading text-2xl sm:text-[26px] font-bold leading-[1.3] text-ink"
                dir="ltr"
              >
                {metrics.activeCourses}
              </div>
              <div className="text-[13px] text-muted">مادة دراسية</div>
            </div>

            <div className="rounded-[18px] border border-line bg-surface p-3.5 sm:p-4 text-center shadow-2xs">
              <div
                className="font-heading text-2xl sm:text-[26px] font-bold leading-[1.3] text-ink"
                dir="ltr"
              >
                1,600+
              </div>
              <div className="text-[13px] text-muted">زائر أسبوعياً</div>
            </div>
          </div>

          {/* Why Did It Start? (لماذا بدأت؟) */}
          <div className="flex flex-col gap-2.5">
            <h2 className="m-0 font-heading text-[24px] sm:text-[25px] font-bold leading-[1.5] text-ink">
              لماذا بدأت؟
            </h2>
            <p className="m-0 text-[16px] leading-[2] text-ink/90">
              كل فصل تتكرر القصة نفسها: ملفات تضيع وسط مئات الرسائل في قروبات
              الواتساب، وروابط تنتهي صلاحيتها، وطلاب يسألون قبل الامتحان بساعات:
              من عنده ملخص هذه المادة؟
            </p>
            <p className="m-0 text-[16px] leading-[2] text-ink/90">
              فجمعت ما عندي وما يشاركه الزملاء في مكان واحد مرتب: ملخصات
              وسلايدات وأسئلة سنوات سابقة، وكويز مراجعة لكل مادة. تفتحه من هاتفك
              بضغطة واحدة، دون حساب.
            </p>
          </div>

          {/* What You Find Here (ما الذي تجده هنا) */}
          <div className="flex flex-col">
            <h2 className="m-0 font-heading text-[24px] sm:text-[25px] font-bold leading-[1.5] text-ink">
              ما الذي تجده هنا
            </h2>

            <div className="mt-2.5 flex flex-col">
              {/* Item 1 */}
              <div className="flex gap-3.5 border-t border-line py-4.5">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  1
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-[17px] font-bold leading-[1.6] text-ink">
                    مجاني وغير ربحي
                  </span>
                  <p className="m-0 text-[15.5px] leading-[1.95] text-muted">
                    لا رسوم ولا اشتراك ولا محتوى مغلق. ملخصات مشروع طلابي وليس
                    تجاريًا.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex gap-3.5 border-t border-line py-4.5">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  2
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-[17px] font-bold leading-[1.6] text-ink">
                    بدون تسجيل
                  </span>
                  <p className="m-0 text-[15.5px] leading-[1.95] text-muted">
                    افتح أي ملف أو ابدأ كويزًا مباشرة، دون حساب أو كلمة مرور.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex gap-3.5 border-t border-line py-4.5">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-hi/70 text-[15px] font-bold text-ink">
                  3
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-[17px] font-bold leading-[1.6] text-ink">
                    مراجعة قبل النشر
                  </span>
                  <p className="m-0 text-[15.5px] leading-[1.95] text-muted">
                    أراجع كل ملف يرفعه الطلاب قبل نشره للتأكد من وضوحه وتصنيفه
                    وأنه لا يخالف الشروط. المراجعة لا تضمن صحة كل معلومة، فارجع
                    دائمًا إلى مادة الدكتور.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Callout Box: What You Must Know */}
          <div className="flex flex-col gap-2 rounded-[22px] border border-[#ECD9A0] bg-[#F7F2E7] p-4.5 sm:p-5 shadow-2xs">
            <span className="flex items-center gap-2 text-[17px] font-bold text-ink">
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-ink"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
              <span>ما يجب أن تعرفه</span>
            </span>

            <p className="m-0 text-[15.5px] leading-[1.95] text-ink/90">
              ملخصات مبادرة مستقلة وغير تابعة رسميًا للجامعة. الملفات من إعداد
              طلاب وقد تحتوي أخطاء، وأسئلة الكويز يولّدها الذكاء الاصطناعي فقد
              تخطئ أيضًا. المرجع الأخير دائمًا هو مادة الدكتور.
            </p>

            <Link
              href="/terms"
              className="self-start inline-flex min-h-[44px] items-center gap-1.5 font-bold text-[15px] text-[#2A4DB0] underline underline-offset-[5px] decoration-[1.5px] hover:opacity-80"
            >
              اقرأ الشروط والخصوصية
            </Link>
          </div>

          {/* Solo Developer Section (أطوّره وحدي) */}
          <div className="flex flex-col gap-2.5">
            <h2 className="m-0 font-heading text-[24px] sm:text-[25px] font-bold leading-[1.5] text-ink">
              أطوّره وحدي
            </h2>

            <p className="m-0 text-[16px] leading-[2] text-ink/90">
              أنا أيضًا طالب وعندي دراستي وامتحاناتي ومشاغلي، ولست متفرغًا دائمًا
              لمتابعة كل مادة أو ملاحقة كل طلب في وقته؛ فاعذرني على أي تقصير أو
              تأخر. ويسعدني جدًا وممتن لمن يساعد زملاءه برفع ما يملكه من
              ملخصات أو أسئلة، ويصل اسمك مع ملفك إن أحببت.
            </p>

            <div className="mt-1.5 flex flex-col sm:flex-row flex-wrap gap-2.5">
              <Link
                href="/upload"
                className="inline-flex h-[54px] flex-1 min-w-[200px] items-center justify-center gap-2.5 rounded-[16px] bg-btn px-5 text-[16.5px] font-bold text-btn-ink transition-all hover:opacity-95 active:scale-95"
              >
                <svg
                  aria-hidden="true"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>ساهم بملف الآن</span>
              </Link>

              <a
                href={`https://wa.me/${CONTACT_PHONE_RAW}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-[52px] flex-1 min-w-[200px] items-center justify-center gap-2.5 rounded-[16px] border-[1.5px] border-ink bg-transparent px-5 text-[16px] font-semibold text-ink transition-all hover:bg-surface active:scale-95"
              >
                <svg
                  aria-hidden="true"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z" />
                  <path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z" />
                </svg>
                <span>واتساب مباشر ({CONTACT_PHONE_LOCAL})</span>
              </a>

              <Link
                href="/terms#s4"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 text-[15px] font-semibold text-muted transition-colors hover:text-ink"
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
                <span>أبلغ عن خطأ أو ملف</span>
              </Link>
            </div>
          </div>

          {/* Project Owner Row */}
          <div className="flex items-center gap-3.5 border-t border-line pt-5">
            <LogoMark size={50} variant="dark" />
            <div className="flex flex-col">
              <span className="text-[13.5px] text-muted">صاحب المشروع</span>
              <TrackedExternalLink
                href="https://github.com/mohammadamour"
                eventType="external_link_click"
                metadata={{ source: "about_author_credit" }}
                className="inline-flex min-h-[36px] items-center gap-1 font-bold text-[#2A4DB0] underline underline-offset-[5px] decoration-[1.5px] hover:opacity-80"
              >
                <span>محمد العمور</span>
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17L17 7M9 7h8v8" />
                </svg>
              </TrackedExternalLink>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
