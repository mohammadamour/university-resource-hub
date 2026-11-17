import Link from "next/link";
import { getCourseHueStyles } from "@/lib/design-hues";
import BookmarkIcon from "@/components/ui/BookmarkIcon";

export interface CardBadge {
  text: string;
  variant?: "primary" | "emerald" | "amber" | "muted" | "accent";
  icon?: string;
}

interface CardProps {
  href: string;
  title: string;
  slug?: string; // Used for deterministic hue mapping; falls back to title
  description?: string | null;
  courseCode?: string | null;
  badge?: string;
  badges?: CardBadge[];
  departmentLabel?: string;
  isPinned?: boolean;
  onTogglePin?: () => void;
  className?: string;
}

/**
 * Reusable course card with a warm-parchment notebook cover aesthetic.
 *
 * Visual design:
 * - Desktop: tall cover (120px) with large letter watermark glyph, ruled notebook
 *   lines gradient, margin guide stroke, department chip, and "افتح المادة" CTA footer.
 * - Mobile (< sm): compact cover (68px) with same visual treatment at smaller scale.
 *   The "افتح المادة" footer row is omitted — the entire card is tappable, so the footer
 *   row would waste precious vertical space on 2-column mobile grids.
 *
 * Color is assigned deterministically from the course slug via getCourseHueStyles(),
 * giving each course a persistent pastel notebook hue without DB changes.
 */
export default function Card({
  href,
  title,
  slug,
  description,
  courseCode,
  badge,
  badges,
  departmentLabel,
  isPinned = false,
  onTogglePin,
  className = "",
}: CardProps) {
  // Use slug for hue; fall back to title if slug not passed.
  const hue = getCourseHueStyles(slug || title);

  // The first non-"ال" character of the title becomes the large watermark glyph.
  const glyph = title.replace(/^ال/, "").charAt(0) || title.charAt(0);

  return (
    <div
      className={`group relative flex flex-col rounded-[22px] border border-line bg-surface overflow-hidden transition-all duration-200 hover:shadow-[0_8px_28px_-10px_rgba(27,31,42,0.18)] active:scale-[0.98] ${
        isPinned ? "border-hi/60 shadow-[0_0_0_2px_rgba(242,212,58,0.25)]" : ""
      } ${className}`}
    >
      {/* ── Notebook Cover Area ──────────────────────────────────────────────── */}
      {/*
        Desktop: 120px tall. Mobile: 68px.
        The cover uses a repeating linear gradient to simulate ruled notebook lines
        on top of the hue-tinted pastel background — zero image assets needed.
      */}
      <div
        aria-hidden="true"
        className="relative h-[68px] sm:h-[108px] overflow-hidden"
        style={{
          backgroundColor: hue.tint,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 23px, ${hue.marginLine.replace("0.38", "0.14")} 23px, ${hue.marginLine.replace("0.38", "0.14")} 24px)`,
        }}
      >
        {/* Vertical margin guide line */}
        <div
          className="absolute top-0 bottom-0 start-7 w-px opacity-50"
          style={{ backgroundColor: hue.deep, opacity: 0.35 }}
        />

        {/* Large watermark letter glyph */}
        <span
          className="absolute -bottom-5 sm:-bottom-7 end-3 sm:end-4 font-heading text-[90px] sm:text-[130px] font-bold leading-none select-none"
          style={{ color: hue.glyphColor }}
        >
          {glyph}
        </span>

        {/* Department chip — top-start corner */}
        {departmentLabel && (
          <span
            className="absolute top-2 sm:top-3 start-9 sm:start-10 inline-flex items-center px-2 py-0.5 rounded-[7px] text-[10px] sm:text-[11px] font-semibold truncate max-w-[70%]"
            style={{ backgroundColor: hue.chipBg, color: hue.deep }}
          >
            {departmentLabel}
          </span>
        )}
      </div>

      {/* ── Card Body ────────────────────────────────────────────────────────── */}
      <Link
        href={href}
        className="flex flex-1 flex-col gap-2 sm:gap-3 p-3 sm:p-4 pb-0 sm:pb-0 rounded-b-[22px]"
      >
        {/* Course code (subtle mono label) */}
        {courseCode && (
          <span className="text-[10px] font-mono font-medium text-muted -mb-1">
            {courseCode}
          </span>
        )}

        {/* Title — 2 lines max on mobile, 3 on desktop */}
        <h3
          dir="auto"
          className="text-[13.5px] sm:text-[17px] font-semibold leading-snug sm:leading-[1.5] text-ink line-clamp-2 sm:line-clamp-3"
          style={{ paddingInlineEnd: onTogglePin ? "2rem" : undefined }}
        >
          {title}
        </h3>

        {/* Stats Badges row (file count / quiz count) */}
        {badges && badges.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-auto pb-3 sm:pb-0">
            {badges.map((b, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold border"
                style={
                  b.variant === "emerald"
                    ? { background: "rgba(20,89,79,0.1)", color: "#14594F", borderColor: "rgba(20,89,79,0.2)" }
                    : b.variant === "muted"
                    ? { background: "rgba(221,213,196,0.5)", color: "var(--muted)", borderColor: "var(--line)" }
                    : { background: `${hue.tint}CC`, color: hue.deep, borderColor: `${hue.tint}` }
                }
              >
                {b.icon && <span className="text-[9px] sm:text-[10px]">{b.icon}</span>}
                <span>{b.text}</span>
              </span>
            ))}
          </div>
        )}

        {/* Legacy single badge fallback */}
        {badge && !badges && (
          <span className="self-start rounded-full bg-hi/20 px-2 py-0.5 text-[10px] font-semibold text-ink/70">
            {badge}
          </span>
        )}
      </Link>

      {/* ── "افتح المادة" CTA Footer — Desktop only ──────────────────────────── */}
      {/*
        Hidden on mobile (<sm). On mobile the entire card is clickable via the <Link>,
        so this row is redundant and wastes vertical space in the 2-column grid.
      */}
      <Link
        href={href}
        aria-hidden="true"
        tabIndex={-1}
        className="hidden sm:flex items-center justify-between px-4 py-3 mt-1 border-t border-dashed border-line text-[13.5px] font-semibold text-ink/80 hover:text-ink transition-colors"
      >
        <span>افتح المادة</span>
        <span
          className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-full"
          style={{ backgroundColor: hue.tint, color: hue.deep }}
        >
          {/* RTL-aware left arrow (points right in RTL = "forward") */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5m0 0l6-6m-6 6l6 6" />
          </svg>
        </span>
      </Link>

      {/* ── Bookmark Toggle Button ───────────────────────────────────────────── */}
      {onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          aria-pressed={isPinned}
          aria-label={isPinned ? `إزالة ${title} من المحفوظات` : `حفظ ${title}`}
          title={isPinned ? "إزالة من المحفوظات" : "حفظ"}
          className="absolute top-2 end-2 sm:top-3 sm:end-3 z-10 inline-flex h-[36px] w-[36px] sm:h-[40px] sm:w-[40px] items-center justify-center rounded-[12px] border transition-all cursor-pointer active:scale-90"
          style={
            isPinned
              ? { backgroundColor: "var(--hi)", borderColor: "transparent", color: "var(--ink)" }
              : { backgroundColor: "rgba(255,253,248,0.80)", borderColor: "transparent", color: "var(--ink)" }
          }
        >
          <BookmarkIcon filled={isPinned} className="h-[14px] w-[14px] sm:h-4 sm:w-4" />
        </button>
      )}
    </div>
  );
}
