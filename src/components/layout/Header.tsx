import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { BookmarkDrawerButton } from "@/components/features/BookmarkDrawer";
import LogoMark from "@/components/ui/LogoMark";

/**
 * Site header with Reem Kufi branding, bookmark drawer trigger, and upload CTA.
 * Warm parchment aesthetic, mobile-first, and RTL-aware.
 *
 * Intentionally stays a Server Component — the bookmark drawer trigger is
 * extracted into BookmarkDrawerButton (a "use client" leaf) so the rest of
 * the header doesn't pay the client-bundle cost.
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Logo / Brand */}
        <Link
          href="/"
          aria-label={`${SITE_NAME} — الرئيسية`}
          className="flex items-center gap-2.5 text-ink transition-opacity hover:opacity-90"
        >
          <LogoMark size={40} priority />
          <span className="font-heading text-2xl sm:text-[27px] font-bold leading-none tracking-tight text-ink">
            {SITE_NAME}
          </span>
        </Link>

        {/* Actions Navigation */}
        <nav className="flex items-center gap-2.5">
          {/* Bookmark drawer trigger — client leaf, keeps Header a Server Component */}
          <BookmarkDrawerButton />

          {/* Share / Upload Resource CTA Button */}
          <Link
            href="/upload"
            className="inline-flex h-[46px] items-center gap-2 rounded-[14px] bg-btn px-4 sm:px-4.5 text-sm sm:text-[15px] font-semibold text-btn-ink shadow-xs transition-all hover:opacity-95 active:scale-95"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
            <span>شارك ملخصك</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
