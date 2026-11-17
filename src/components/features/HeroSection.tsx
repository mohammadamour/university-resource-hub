interface HeroSectionProps {
  totalCourses?: number;
  totalResources?: number;
}

/**
 * 🌟 Homepage Hero Section
 *
 * Reem Kufi typography, warm parchment status pill, yellow highlight marker,
 * trust badges, and decorative CSS mock cards for desktop viewports.
 * Search bar deliberately omitted to keep user focus on course categories.
 */
export default function HeroSection({
  totalCourses = 20,
  totalResources = 130,
}: HeroSectionProps) {
  return (
    <section className="pt-6 pb-6 sm:pt-10 sm:pb-8 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
      {/* Text Content Column */}
      <div className="flex-1 min-w-0 flex flex-col items-start gap-4 sm:gap-5 text-start">
        {/* Status Pill */}
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-line bg-surface text-xs sm:text-sm font-medium text-ink shadow-xs">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-brand-green animate-pulse"
          />
          <span>مشروع طلابي · مجاني · بدون تسجيل</span>
        </span>

        {/* H1 Heading */}
        <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl lg:text-[52px] text-ink leading-[1.3] sm:leading-[1.35] tracking-tight">
          كل ملخصاتك في مكان واحد،{" "}
          <mark className="bg-hi text-ink px-2 py-0.5 rounded-[10px] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
            بدون ما تدوّر
          </mark>{" "}
          في القروبات.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg leading-relaxed text-muted max-w-xl">
          ملخصات وامتحانات سابقة وكويزات تفاعلية لمواد جامعة جدارا، مرتّبة حسب المادة وجاهزة للقراءة والتحميل فوراً.
        </p>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs sm:text-sm text-muted pt-1">
          <span className="inline-flex items-center gap-2">
            <svg
              aria-hidden="true"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 7.5-2" />
            </svg>
            <span>بدون تسجيل دخول</span>
          </span>

          <span className="inline-flex items-center gap-2">
            <svg
              aria-hidden="true"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
              <path d="M14 3v4h4M9 12h6M9 16h6" />
            </svg>
            <span>{totalCourses} مادة · +{totalResources} ملف</span>
          </span>

          <span className="inline-flex items-center gap-2">
            <svg
              aria-hidden="true"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 12.5l2.5 2.5 4.5-5" />
            </svg>
            <span>كويزات مع شرح لكل إجابة</span>
          </span>
        </div>
      </div>

      {/* Decorative Mockup Stack (Desktop / Large Screens only) */}
      <div
        aria-hidden="true"
        className="hidden lg:block relative shrink-0 w-[350px] h-[330px] select-none"
      >
        {/* Floating Note Mockup */}
        <div className="absolute top-2 start-1 w-[230px] h-[290px] -rotate-4 rounded-[18px] bg-[#FFFDF8] border border-[#E6DFCF] shadow-[0_22px_44px_-20px_rgba(20,24,35,0.45)] p-4 flex flex-col gap-2.5 text-ink">
          <span className="self-start px-2.5 py-0.5 rounded-md bg-[#F7DDD3] text-[#A8361C] text-[11px] font-bold">
            ملخص · 7 صفحات
          </span>
          <div className="h-2.5 w-[65%] rounded bg-ink mt-1" />
          <div className="h-1.5 w-[92%] rounded bg-[#E4DDCC]" />
          <div className="h-1.5 w-[78%] rounded bg-hi" />
          <div className="h-1.5 w-[85%] rounded bg-[#E4DDCC]" />
          <div className="h-1.5 w-[60%] rounded bg-[#E4DDCC]" />
          <div className="h-1.5 w-[88%] rounded bg-[#E4DDCC]" />
          <div className="h-1.5 w-[50%] rounded bg-hi" />
          <div className="h-1.5 w-[72%] rounded bg-[#E4DDCC]" />

          {/* Micro Referral Loop Badge */}
          <div className="mt-auto self-start [direction:ltr] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#141A26] text-[#FFFDF8] text-[11px] font-semibold">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#33D9A6">
              <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
            </svg>
            <span>molakhasat.me</span>
          </div>
        </div>

        {/* Floating Quiz Score Card */}
        <div className="absolute bottom-1 end-0 w-[185px] rotate-5 rounded-[20px] bg-btn text-btn-ink shadow-[0_22px_44px_-20px_rgba(20,24,35,0.55)] p-4 flex items-center gap-3">
          <svg
            width="64"
            height="64"
            viewBox="0 0 100 100"
            className="shrink-0 -rotate-90"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="9"
              className="stroke-btn-ink/20"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="282.74"
              strokeDashoffset="56.55"
              className="stroke-hi"
            />
          </svg>
          <div className="flex flex-col">
            <span className="font-heading text-2xl font-bold leading-tight">
              80%
            </span>
            <span className="text-[12px] opacity-85 leading-snug">
              8 من 10 أسئلة
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
