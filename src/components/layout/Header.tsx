import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { BookmarkDrawerButton } from "@/components/features/BookmarkDrawer";

/**
 * Site header with branding and navigation.
 * Mobile-first, lightweight, and RTL-aware.
 *
 * Intentionally stays a Server Component — the bookmark drawer trigger is
 * extracted into BookmarkDrawerButton (a "use client" leaf) so the rest of
 * the header doesn't pay the client-bundle cost.
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
        <nav className="flex items-center gap-2 sm:gap-3">
          {/* Guides link temporarily hidden until guides are populated */}
          {/* <Link
            href="/guides"
            className="text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            أدلة ونصائح
          </Link> */}

          {/* Bookmark drawer trigger — client leaf, keeps this file as a Server Component */}
          <BookmarkDrawerButton />

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
