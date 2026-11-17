import { SITE_NAME, WHATSAPP_COMMUNITY_URL } from "@/lib/constants";
import TrackedExternalLink from "@/components/ui/TrackedExternalLink";

/**
 * Site footer with Reem Kufi branding, community WhatsApp group CTA, and trust disclaimer.
 * Follows the warm parchment design language with accessible contrast and touch targets.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Main Brand & Community Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-8">
          <div className="flex flex-col gap-1.5 max-w-xl">
            <span className="font-heading text-[22px] font-bold text-ink leading-tight">
              {SITE_NAME}
            </span>
            <p className="text-sm sm:text-[15px] leading-relaxed text-muted">
              مشروع طلابي غير ربحي لطلبة جامعة جدارا. عندك ملاحظة، أو بدك نشيل ملف؟ تواصل معنا عبر قروب الملاحظات وبنرد بسرعة.
            </p>
          </div>

          <TrackedExternalLink
            href={WHATSAPP_COMMUNITY_URL}
            eventType="whatsapp_community_click"
            metadata={{ source: "footer_cta" }}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-ink bg-transparent px-5 text-sm sm:text-[15px] font-semibold text-ink transition-all hover:bg-surface active:scale-95 cursor-pointer"
          >
            <span>انضم لقروب الملاحظات</span>
            <span aria-hidden="true">↗</span>
          </TrackedExternalLink>
        </div>

        {/* Trust Disclaimer */}
        <div className="mb-6 rounded-2xl border border-line bg-surface/70 p-4 text-center">
          <p className="text-xs sm:text-sm leading-relaxed text-muted">
            ⚠️ {SITE_NAME} مبادرة طلابية لمساعدة زملائنا في الدراسة. هذا الموقع غير مرتبط رسمياً بالجامعة. تأكد دائماً من متطلبات المادة مع مدرس المساق.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted">
          <p>
            © {currentYear} {SITE_NAME}. صُنع بـ ❤️ لطلاب جامعة جدارا.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/mohammadamour/university-resource-hub"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-ink"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
