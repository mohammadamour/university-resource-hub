import Link from "next/link";
import BookmarkIcon from "@/components/ui/BookmarkIcon";

export interface CardBadge {
  text: string;
  variant?: "primary" | "emerald" | "amber" | "muted" | "accent";
  icon?: string;
}

interface CardProps {
  href: string;
  title: string;
  description?: string | null;
  courseCode?: string | null;
  badge?: string;
  badges?: CardBadge[];
  isPinned?: boolean;
  onTogglePin?: () => void;
  className?: string;
}

/**
 * Reusable card component for displaying courses and departments.
 * Compact and responsive: optimized for 2-column mobile layouts and 3-column desktop layouts.
 * When onTogglePin is provided, the bookmark button sits as a sibling overlay outside
 * the <Link> to preserve valid HTML and separate click targets.
 */
export default function Card({
  href,
  title,
  description,
  courseCode,
  badge,
  badges,
  isPinned = false,
  onTogglePin,
  className = "",
}: CardProps) {
  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border bg-card transition-all duration-200 hover:border-accent hover:shadow-md active:scale-[0.98] ${
        isPinned ? "border-amber-500/45 shadow-xs" : "border-border"
      } ${className}`}
    >
      <Link
        href={href}
        className="flex flex-1 flex-col justify-between gap-2 p-3.5 sm:p-5 rounded-2xl"
      >
        <div className={onTogglePin ? "pe-10 sm:pe-9" : undefined}>
          {/* Top row: course code + single legacy badge if present */}
          {(courseCode || badge) && (
            <div className="flex items-center justify-between mb-1.5">
              {courseCode && (
                <span className="text-[11px] font-mono font-medium text-muted-foreground sm:text-xs">
                  {courseCode}
                </span>
              )}
              {badge && (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent sm:text-xs">
                  {badge}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h3
            dir="auto"
            className="text-sm font-bold leading-snug text-card-foreground group-hover:text-accent transition-colors line-clamp-2 sm:text-base lg:text-lg"
          >
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p
              dir="auto"
              className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed"
            >
              {description}
            </p>
          )}
        </div>

        {/* Dynamic Stats Row at bottom */}
        {badges && badges.length > 0 && (
          <div className="mt-auto flex flex-wrap items-center gap-1 sm:gap-1.5 pt-2">
            {badges.map((b, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold border ${
                  b.variant === "emerald"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                    : b.variant === "amber"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                    : b.variant === "muted"
                    ? "bg-secondary/70 text-muted-foreground border-border"
                    : "bg-accent/10 text-accent border-accent/25"
                }`}
              >
                {b.icon && <span className="text-[10px] sm:text-xs">{b.icon}</span>}
                <span>{b.text}</span>
              </span>
            ))}
          </div>
        )}
      </Link>

      {/* Sibling Bookmark Toggle (positioned at inline-end top corner so it never overlaps text) */}
      {onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={isPinned}
          aria-label={isPinned ? `إزالة ${title} من مقرراتي المحفوظة` : `حفظ ${title} في مقرراتي`}
          title={isPinned ? "إزالة من مقرراتي المحفوظة" : "حفظ في مقرراتي"}
          className={`absolute top-2 end-2 sm:top-3 sm:end-3 z-10 flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-xl border transition-all cursor-pointer active:scale-90 ${
            isPinned
              ? "border-amber-500/40 bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
              : "border-transparent bg-secondary/70 text-muted-foreground/80 opacity-85 hover:opacity-100 hover:border-border hover:bg-secondary hover:text-foreground"
          }`}
        >
          <BookmarkIcon filled={isPinned} className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
