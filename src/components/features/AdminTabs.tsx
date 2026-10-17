import Link from "next/link";

interface AdminTabsProps {
  activeTab: "upload" | "resources";
  adminSecret: string;
  resourceCount?: number;
}

/**
 * Shared navigation header for the Super-Admin portal.
 * Seamlessly preserves the `?key=` query param across administrative tools.
 */
export default function AdminTabs({
  activeTab,
  adminSecret,
  resourceCount,
}: AdminTabsProps) {
  return (
    <div className="mb-8">
      {/* Super Admin Status Pill */}
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          بوابة الإدارة المركزية · مصرح (Super Admin)
        </div>
      </div>

      {/* Segmented Tab Control */}
      <nav
        aria-label="Admin Navigation"
        className="flex items-center gap-2 border-b border-border pb-3"
      >
        <Link
          href={`/upload?key=${encodeURIComponent(adminSecret)}`}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "upload"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span>📤</span>
          <span>رفع مادة جديدة</span>
        </Link>

        <Link
          href={`/admin/resources?key=${encodeURIComponent(adminSecret)}`}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "resources"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span>🗂️</span>
          <span>إدارة الموارد المرفوعة</span>
          {typeof resourceCount === "number" && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === "resources"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted-foreground/15 text-muted-foreground"
              }`}
            >
              {resourceCount}
            </span>
          )}
        </Link>
      </nav>
    </div>
  );
}
