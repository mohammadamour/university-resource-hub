import type { Resource, ResourceType } from "@/types/database";

interface ResourceListProps {
  resources: Resource[];
}

/**
 * Renders a list of resources for a specific course.
 * Separates core study materials (summaries, quizzes) into tabs,
 * and external deep-dive resources (links, videos) into a separate section.
 */
export default function ResourceList({ resources }: ResourceListProps) {
  // Separate resources into primary study materials vs deep dive external links
  const studyMaterials = resources.filter(
    (r) => r.type !== "link" && r.type !== "other"
  );
  const deepDiveResources = resources.filter(
    (r) => r.type === "link" || r.type === "other"
  );

  const availableStudyTypes = Array.from(
    new Set(studyMaterials.map((r) => r.type))
  ) as ResourceType[];

  const sectionNames: Partial<Record<ResourceType, string>> = {
    summary: "ملخصات",
    quiz: "كويزات",
    past_exam: "أسئلة سنوات",
    guide: "أدلة",
  };

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

  // Helper to render a resource item
  const renderResource = (resource: Resource) => (
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {resource.uploaded_by && <span>• الإدارة</span>}
            {resource.file_size_bytes && (
              <span>• {(resource.file_size_bytes / 1024 / 1024).toFixed(1)} MB</span>
            )}
          </div>
        </div>

        {/* Download / Link Icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {resource.type === "link" || resource.type === "other" ? "↗" : "⬇"}
        </div>
      </a>
    </li>
  );

  return (
    <div className="space-y-10">
      {/* 1. Primary Study Materials */}
      {studyMaterials.length > 0 && (
        <div className="space-y-8">
          {availableStudyTypes.map((type) => {
            const typeResources = studyMaterials.filter((r) => r.type === type);
            return (
              <div key={type} className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {sectionNames[type]}
                </h3>
                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                  {typeResources.map(renderResource)}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Deep Dive / External Resources */}
      {deepDiveResources.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            مصادر الشرح والتعمق 📺
          </h3>
          <p className="text-sm text-muted-foreground">
            شروحات يوتيوب، دورات، ومراجع خارجية لفهم المادة بشكل أعمق.
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {deepDiveResources.map(renderResource)}
          </ul>
        </div>
      )}
    </div>
  );
}
