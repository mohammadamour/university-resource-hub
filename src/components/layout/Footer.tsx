import { SITE_NAME, WHATSAPP_COMMUNITY_URL } from "@/lib/constants";

/**
 * Site footer with trust disclaimer, WhatsApp community group, and links.
 * The disclaimer is a core requirement from the README —
 * it establishes that this is student-made and not an official university site.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* WhatsApp Community Bar (Subtle & Compact) */}
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-2 rounded-xl border border-border/70 bg-secondary/30 px-3.5 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 text-sm">💬</span>
            <span>مجتمع IT جدارا على واتساب لمشاركة المواد والمساعدة الأكاديمية</span>
          </div>
          <a
            href={WHATSAPP_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-emerald-400 transition-colors shrink-0"
          >
            <span>انضمام للمجموعة</span>
            <span className="text-[10px]">↗</span>
          </a>
        </div>

        {/* Trust Disclaimer */}
        <div className="mb-6 rounded-lg bg-secondary p-4 text-center">
          <p className="text-sm text-muted-foreground">
            ⚠️ {SITE_NAME} مبادرة طلابية لمساعدة زملائنا في الدراسة. هذا الموقع
            غير مرتبط رسمياً بالجامعة. تأكد دائماً من متطلبات المادة مع دكتورك.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>
            © {currentYear} {SITE_NAME}. صُنع بـ ❤️ لطلاب الجامعة.
          </p>
          <div className="flex gap-4">
            <a
              href="https://github.com/mohammadamour/university-resource-hub"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
