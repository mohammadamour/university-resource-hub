import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

/**
 * Site header with branding and navigation.
 * Mobile-first, lightweight, and RTL-aware.
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-primary transition-colors hover:text-accent"
        >
          <span className="text-2xl">📚</span>
          <span>{SITE_NAME}</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/guides"
            className="text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            أدلة ونصائح
          </Link>

          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
          >
            <span>📤</span>
            <span>شارك ملخصك</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
