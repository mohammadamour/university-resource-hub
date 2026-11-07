import Link from "next/link";

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
}

/**
 * Reusable card component for displaying courses and departments.
 * Compact and responsive: optimized for 2-column mobile layouts and 3-column desktop layouts.
 * Features dynamic dual-pill indicators for live study resources,
 * active quizzes, and empty course indicators.
 */
export default function Card({
  href,
  title,
  description,
  courseCode,
  badge,
  badges,
}: CardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between gap-2 rounded-2xl border border-border bg-card p-3.5 transition-all duration-200 hover:border-accent hover:shadow-md active:scale-[0.98] sm:p-5"
    >
      <div>
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
        <h3 className="text-sm font-bold leading-snug text-card-foreground group-hover:text-accent transition-colors line-clamp-2 sm:text-base lg:text-lg">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
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
  );
}
