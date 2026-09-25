import { SITE_NAME } from "@/lib/constants";

/**
 * Site footer with trust disclaimer and links.
 * The disclaimer is a core requirement from the README —
 * it establishes that this is student-made and not an official university site.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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
