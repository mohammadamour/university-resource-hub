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
        {/* WhatsApp Community Invitation */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 sm:p-5 text-center sm:text-start transition-all hover:border-emerald-500/40">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 text-2xl shadow-sm">
              💬
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                مجتمع الدفعة على واتساب
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
                انضم لمجموعتنا لمشاركة الملاحظات، طلب ملخصات وشروحات للمواد، والمساعدة الأكاديمية بين الزملاء.
              </p>
            </div>
          </div>
          <a
            href={WHATSAPP_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>انضم إلى القروب</span>
            <span>↗</span>
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
