import Link from "next/link";

interface CardProps {
  href: string;
  title: string;
  description?: string | null;
  courseCode?: string | null;
  badge?: string;
  resourceCount?: number;
}

/**
 * Reusable card component for displaying courses and departments.
 * Designed to be tappable on mobile (large touch target) and
 * visually clean to match the university portal aesthetic.
 */
export default function Card({
  href,
  title,
  description,
  courseCode,
  badge,
  resourceCount,
}: CardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-accent hover:shadow-md active:scale-[0.98] sm:p-5"
    >
      {/* Top row: course code + badge */}
      <div className="flex items-center justify-between">
        {courseCode && (
          <span className="text-xs font-mono font-medium text-muted-foreground">
            {courseCode}
          </span>
        )}
        {badge && (
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
            {badge}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-card-foreground group-hover:text-accent transition-colors sm:text-lg">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}

      {/* Resource count */}
      {resourceCount !== undefined && (
        <p className="mt-auto text-xs text-muted-foreground">
          {resourceCount} {resourceCount === 1 ? "مورد" : "موارد"}
        </p>
      )}
    </Link>
  );
}
