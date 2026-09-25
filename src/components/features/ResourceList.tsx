import type { Resource } from "@/types/database";
import Badge from "@/components/ui/Badge";
import { formatFileSize } from "@/lib/utils";

interface ResourceListProps {
  resources: Resource[];
}

/**
 * Renders a list of resources (PDFs, quizzes, links) for a specific course.
 * Each resource is a tappable row with a type badge and file size.
 */
export default function ResourceList({ resources }: ResourceListProps) {
  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">
          لا توجد موارد متاحة لهذه المادة حالياً 📭
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          سيتم إضافة المحتوى قريباً. تابعونا!
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {resources.map((resource) => (
        <li key={resource.id}>
          <a
            href={resource.storage_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary active:bg-secondary/80 sm:gap-4"
          >
            {/* File icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-lg">
              {resource.type === "summary" && "📄"}
              {resource.type === "quiz" && "❓"}
              {resource.type === "past_exam" && "📝"}
              {resource.type === "guide" && "📖"}
              {resource.type === "link" && "🔗"}
              {resource.type === "other" && "📎"}
            </div>

            {/* Resource info */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-sm font-medium text-card-foreground sm:text-base">
                {resource.title}
              </span>
              {resource.file_size_bytes && (
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(resource.file_size_bytes)}
                </span>
              )}
            </div>

            {/* Badge */}
            <Badge type={resource.type} />
          </a>
        </li>
      ))}
    </ul>
  );
}
